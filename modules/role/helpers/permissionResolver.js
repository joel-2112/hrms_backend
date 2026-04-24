// modules/role/utils/permissionResolver.js
'use strict';

const roleService = require('../services/roleService');

/**
 * Thin wrapper for middleware use.
 * Does NOT contain business logic — just delegates to service.
 */
const hasPermission = async (userId, resourceName, action) => {
  return roleService.checkPermission(userId, resourceName, action);
};

const getUserEffectivePermissions = async (userId) => {
  return roleService.getUserEffectivePermissions(userId);
};

const getUserPermissionFilter = async (userId, allowDocType, fkColumn) => {
  return roleService.getUserPermissionFilter(userId, allowDocType, fkColumn);
};

module.exports = {
  hasPermission,
  getUserEffectivePermissions,
  getUserPermissionFilter,
};