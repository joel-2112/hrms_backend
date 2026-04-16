'use strict';

const { forbidden } = require('../utils/response');
const logger = require('../utils/logger');
const { hasPermission, getUserEffectivePermissions } = require('../modules/role/helpers/permissionResolver');

const action = Object.freeze({
  READ:            'read',
  WRITE:           'write',
  CREATE:          'create',
  DELETE:          'delete',
  SUBMIT:          'submit',
  CANCEL:          'cancel',
  AMEND:           'amend',
  PRINT:           'print',
  EMAIL:           'email',
  IMPORT:          'import',
  EXPORT:          'export',
  REPORT:          'report',
  SET_PERMISSIONS: 'setPermissions',
});

/**
 * authorize(resourceName, actions)
 */
const authorize = (resourceName, actions) => {
  const requiredActions = Array.isArray(actions) ? actions : [actions];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return forbidden(res, 'Authentication required');
      }

      // Superuser bypass
      if (user.isSuperUser || user.isSystemManager) {
        req.perms = { canRead: true, canWrite: true, canCreate: true, canDelete: true };
        return next();
      }

      // Check each required action
      for (const act of requiredActions) {
        const hasAccess = await hasPermission(user.id, resourceName, act);

        if (!hasAccess) {
          logger.warn('RBAC denied', { 
            userId: user.id, 
            resourceName, 
            action: act 
          });
          return forbidden(res, `Access denied: missing ${act} permission on ${resourceName}`);
        }
      }

      // Attach effective permissions for controllers (optional but useful)
      req.perms = await getUserEffectivePermissions(user.id);

      return next();

    } catch (err) {
      logger.error('RBAC middleware error', { error: err.message });
      return next(err);
    }
  };
};

module.exports = {
  action,
  authorize,
};