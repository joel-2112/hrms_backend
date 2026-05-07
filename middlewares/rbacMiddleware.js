"use strict";

const { forbidden } = require("../utils/response");
const logger = require("../utils/logger");
const {
  hasPermission,
  getUserEffectivePermissions,
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
 * authorize(resourceName, actions)
 *
 * @param {string} resourceName - e.g. 'Employee', 'LeaveApplication'
 * @param {string|string[]} actions - Single action or array of actions.
 *   If array is provided, user needs ANY ONE of the actions (OR logic).
 *
 * Usage:
 *   authorize('LeaveType', action.READ)                    // Single action
 *   authorize('LeaveType', [action.READ, action.READ_SELF]) // Multiple (OR)
 */
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
        };
        return next();
      }

      // ═══════════════════════════════════════════════════════════
      //  OR LOGIC: User needs ANY ONE of the required actions
      // ═══════════════════════════════════════════════════════════
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

      // Attach effective permissions for controllers (optional but useful)
      req.perms = await getUserEffectivePermissions(user.id);

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