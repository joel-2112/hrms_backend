'use strict';

/**
 * middlewares/rbac.middleware.js
 *
 * Frappe-style permission enforcement in two layers:
 *
 *   Layer 1 — Role Permission
 *     Can this user's roles perform action X on DocType Y?
 *     Reads from: RolePermission (via User → UserRole → Role → RolePermission)
 *     Bypass:     isSuperUser = true  →  always allowed
 *                 isSystemManager = true  →  always allowed
 *
 *   Layer 2 — User Permission  (record-level restriction)
 *     Even if the role allows read, is this user restricted to
 *     specific records of a DocType? (e.g. only Branch = "Nairobi")
 *     Reads from: UserPermission
 *     Applied by: services that call getUserPermissionFilter()
 *
 * Usage in routes:
 *
 *   const { authorize, action } = require('../../middlewares/rbac.middleware');
 *
 *   // Single action gate
 *   router.get('/employees',
 *     authenticate,
 *     authorize('Employee', action.READ),
 *     employeeController.list,
 *   );
 *
 *   // Multiple actions (user needs ALL of them)
 *   router.post('/employees/:id/submit',
 *     authenticate,
 *     authorize('Employee', [action.READ, action.SUBMIT]),
 *     employeeController.submit,
 *   );
 *
 * getUserPermissionFilter() usage in a service:
 *
 *   const { getUserPermissionFilter } = require('../../middlewares/rbac.middleware');
 *
 *   async function listEmployees(req) {
 *     const permFilter = await getUserPermissionFilter(req.user.id, 'Branch', 'branchId');
 *     const { count, rows } = await Employee.findAndCountAll({
 *       where: { companyId, ...permFilter },
 *     });
 *   }
 */

'use strict';

const { Op }       = require('sequelize');
const { forbidden } = require('../utils/response');
const logger        = require('../utils/logger');

// Lazy-load models to avoid circular import at startup
const getModels = () => require('../models');

// ─────────────────────────────────────────────
//  ACTION CONSTANTS
//  Mirror every flag on RolePermission exactly.
// ─────────────────────────────────────────────
const action = Object.freeze({
  READ:            'canRead',
  WRITE:           'canWrite',
  CREATE:          'canCreate',
  DELETE:          'canDelete',
  SUBMIT:          'canSubmit',
  CANCEL:          'canCancel',
  AMEND:           'canAmend',
  PRINT:           'canPrint',
  EMAIL:           'canEmail',
  IMPORT:          'canImport',
  EXPORT:          'canExport',
  REPORT:          'canReport',
  SET_PERMISSIONS: 'canSetPermissions',
});

// ─────────────────────────────────────────────
//  PERMISSION RESOLVER
//
//  Fetches all RolePermission rows that apply to
//  this user for the given resource and returns a
//  merged permission object.
//
//  Merging rule (Frappe convention):
//    If ANY role grants an action, the user has it.
//    Permissions are additive — never subtractive.
//
//  Returns: { canRead: true, canWrite: false, ... }
// ─────────────────────────────────────────────
const resolvePermissions = async (userId, resourceName) => {
  const { User, RolePermission } = getModels();

  // Fetch the user with all their roles (direct + from role profile)
  const user = await User.unscoped().findByPk(userId, {
    include: [
      {
        association: 'roles',   // User.belongsToMany(Role, { as: 'roles', ... })
        attributes:  ['id'],
        through:     { attributes: [] },
      },
    ],
  });

  if (!user) return null;

  // Collect all role IDs this user holds
  const roleIds = (user.roles || []).map((r) => r.id);

  if (!roleIds.length) return null;

  // Fetch all RolePermission rows for these roles + this resource
  const permissions = await RolePermission.findAll({
    where: {
      roleId:       { [Op.in]: roleIds },
      resourceName,
    },
    attributes: [
      'canRead', 'canWrite', 'canCreate', 'canDelete',
      'canSubmit', 'canCancel', 'canAmend',
      'canPrint', 'canEmail', 'canImport', 'canExport',
      'canReport', 'canSetPermissions',
    ],
  });

  if (!permissions.length) return null;

  // Merge — additive: true wins over false across all rows
  const merged = {
    canRead: false, canWrite: false, canCreate: false, canDelete: false,
    canSubmit: false, canCancel: false, canAmend: false,
    canPrint: false, canEmail: false, canImport: false, canExport: false,
    canReport: false, canSetPermissions: false,
  };

  for (const perm of permissions) {
    for (const key of Object.keys(merged)) {
      if (perm[key]) merged[key] = true;
    }
  }

  return merged;
};

// ─────────────────────────────────────────────
//  AUTHORIZE  (Express middleware factory)
//
//  authorize(resourceName, actions)
//
//  @param {string}          resourceName  - DocType name e.g. 'Employee'
//  @param {string|string[]} actions       - one or more action constants
// ─────────────────────────────────────────────
const authorize = (resourceName, actions) => {
  const requiredActions = Array.isArray(actions) ? actions : [actions];

  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return forbidden(res, 'Authentication required');
      }

      // ── Superuser bypass ──────────────────────────────────────
      if (user.isSuperUser || user.isSystemManager) {
        logger.debug('RBAC bypassed (superuser)', { userId: user.id, resourceName });
        return next();
      }

      // ── Resolve merged permissions for this user + resource ───
      const perms = await resolvePermissions(user.id, resourceName);

      if (!perms) {
        logger.warn('RBAC denied (no permissions found)', {
          userId: user.id, resourceName, requiredActions,
        });
        return forbidden(res);
      }

      // ── Check every required action ───────────────────────────
      const denied = requiredActions.filter((a) => !perms[a]);

      if (denied.length) {
        logger.warn('RBAC denied', {
          userId: user.id, resourceName, denied,
        });
        return forbidden(res);
      }

      // ── Attach resolved perms for downstream use ──────────────
      // Controllers can read req.perms.canDelete etc. without
      // querying the DB again.
      req.perms = perms;

      logger.debug('RBAC granted', { userId: user.id, resourceName, requiredActions });
      return next();

    } catch (err) {
      return next(err);
    }
  };
};

// ─────────────────────────────────────────────
//  getUserPermissionFilter
//
//  Builds a Sequelize WHERE clause fragment that
//  restricts a query to records allowed by the
//  user's UserPermission rows.
//
//  @param {string} userId
//  @param {string} allowDocType   - the DocType being filtered e.g. 'Branch'
//  @param {string} fkColumn       - the FK column on the target model e.g. 'branchId'
//  @returns {object} Sequelize where fragment  e.g. { branchId: { [Op.in]: ['uuid1', 'uuid2'] } }
//                    or {}  if the user has no restrictions (sees everything)
//
//  Usage in service:
//    const filter = await getUserPermissionFilter(userId, 'Branch', 'branchId');
//    Employee.findAll({ where: { ...filter, ...otherConditions } });
// ─────────────────────────────────────────────
const getUserPermissionFilter = async (userId, allowDocType, fkColumn) => {
  const { User, UserPermission } = getModels();

  // Superusers / system managers see everything
  const user = await User.unscoped().findByPk(userId, {
    attributes: ['isSuperUser', 'isSystemManager'],
  });

  if (!user || user.isSuperUser || user.isSystemManager) {
    return {};
  }

  const restrictions = await UserPermission.findAll({
    where: { userId, allowDocType },
    attributes: ['allowValue'],
  });

  // No restrictions → user sees all records of this DocType
  if (!restrictions.length) return {};

  const allowedValues = restrictions.map((r) => r.allowValue);

  return { [fkColumn]: { [Op.in]: allowedValues } };
};

module.exports = {
  action,
  authorize,
  resolvePermissions,
  getUserPermissionFilter,
};