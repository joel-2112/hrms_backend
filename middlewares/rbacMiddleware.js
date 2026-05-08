"use strict";

const { forbidden } = require("../utils/response");
const logger = require("../utils/logger");
const {
  hasPermission,
  getUserEffectivePermissions,
  getUserPermissionFilter,
} = require("../modules/role/helpers/permissionResolver");

const action = Object.freeze({
  READ: "read",
  READ_SELF: "readSelf",
  WRITE: "write",
  CREATE: "create",
  DELETE: "delete",
  SUBMIT: "submit",
  CANCEL: "cancel",
  AMEND: "amend",
  PRINT: "print",
  EMAIL: "email",
  IMPORT: "import",
  EXPORT: "export",
  REPORT: "report",
  SET_PERMISSIONS: "setPermissions",
});

/**
 * Build data filter from effective permissions' userPermissions array.
 * Automatically converts allowDocType -> fieldName by lowercasing first char + "Id".
 * 
 * Example: 
 *   allowDocType: "Branch" -> branchId
 *   allowDocType: "Department" -> departmentId
 *   allowDocType: "Company" -> companyId
 */
const buildDataFilter = (userPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return {};
  }

  const filter = {};

  for (const perm of userPermissions) {
    if (!perm.allowDocType || !perm.allowValue) continue;

    // Convert DocType to camelCase field name + "Id"
    // Branch -> branchId, Department -> departmentId, etc.
    const fieldName = perm.allowDocType.charAt(0).toLowerCase() + 
                      perm.allowDocType.slice(1) + 'Id';

    // If multiple permissions for same docType, we'll use the last one
    // For multiple values support, we could collect them in an array
    filter[fieldName] = perm.allowValue;
  }

  return filter;
};

const authorize = (resourceName, actions) => {
  const requiredActions = Array.isArray(actions) ? actions : [actions];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return forbidden(res, "Authentication required");
      }

      // Superuser / System Manager bypass
      if (user.isSuperUser || user.isSystemManager) {
        req.perms = {
          canRead: true,
          canWrite: true,
          canCreate: true,
          canDelete: true,
          canSubmit: true,
          dataFilter: {}, // No restrictions for superusers
          userPermissions: [],
        };
        return next();
      }

      let hasAccess = false;
      let deniedAction = null;

      for (const act of requiredActions) {
        const access = await hasPermission(user.id, resourceName, act);
        if (access) {
          hasAccess = true;
          break; // User has at least one required permission — allow
        }
        deniedAction = act;
      }

      if (!hasAccess) {
        logger.warn("RBAC denied", {
          userId: user.id,
          resourceName,
          actions: requiredActions,
        });
        return forbidden(
          res,
          `Access denied: missing required permission on ${resourceName}`,
        );
      }

      // Get effective permissions including userPermissions
      const effectivePerms = await getUserEffectivePermissions(user.id);
      
      // Build data filter from userPermissions dynamically
      const dataFilter = buildDataFilter(effectivePerms.userPermissions || []);
      
      // Attach everything to req.perms for controllers to use
      req.perms = {
        ...effectivePerms,
        dataFilter,
      };

      return next();
    } catch (err) {
      logger.error("RBAC middleware error", { error: err.message });
      return next(err);
    }
  };
};

module.exports = {
  action,
  authorize,
};