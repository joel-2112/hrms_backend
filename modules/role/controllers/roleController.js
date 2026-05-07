// 'use strict';

const roleService = require('../services/roleService');
const { ok, created, noContent, notFound, conflict, unprocessable } = require('../../../utils/response');
const { catchAsync } = require('../../../utils/catchAsync');



const createRole = async (req, res, next) => {
  try {
    const { name, isSystemRole } = req.body;
    const role = await roleService.createRole({ name, isSystemRole });
    created(res, role, 'Role created successfully');
  } catch (err) {
    next(err);
  }
};

const getAllRoles = async (req, res, next) => {
  try {
    const { includeDisabled, page, limit } = req.query;
    const result = await roleService.getAllRoles({ 
      includeDisabled: includeDisabled === 'true',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'Roles fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getRole = async (req, res, next) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    ok(res, role, 'Role fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { name, disabled } = req.body;
    const role = await roleService.updateRole(req.params.id, { name, disabled });
    ok(res, role, 'Role updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    await roleService.deleteRole(req.params.id);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

const getRolePermissions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await roleService.getRolePermissions(req.params.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'Permissions fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const upsertPermission = async (req, res, next) => {
  try {
    const permission = await roleService.upsertRolePermission(req.params.id, req.body);
    ok(res, permission, 'Permission saved successfully');
  } catch (err) {
    next(err);
  }
};

const deletePermission = async (req, res, next) => {
  try {
    await roleService.deleteRolePermission(req.params.permissionId);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/roles/permissions/resources
 *
 * Returns a flat array of distinct resource names across all permission rules.
 * Used by the frontend for the "Resource" search/autocomplete dropdown.
 *
 * Query: ?search=Leave  (optional client-side filter)
 */
const getAllResourceNames = catchAsync(async (req, res) => {
  const resourceNames = await roleService.getAllResourceNames();

  const { search } = req.query;
  let filtered = resourceNames;
  if (search) {
    const term = search.toLowerCase();
    filtered = resourceNames.filter(name => name.toLowerCase().includes(term));
  }

  ok(res, {
    message: 'Resource names fetched successfully',
    data: filtered,
    meta: { total: filtered.length },
  });
});

const getAvailableResources = catchAsync(async (req, res) => {
  const resources = await roleService.getAvailableResources();
  ok(res, {
    message: 'Available resources fetched successfully',
    data: resources,
    meta: { total: resources.length },
  });
});


/**
 * GET /api/roles/permissions
 *
 * Returns permission rows filtered by resource name and/or role.
 * Both filters are optional.
 *
 * Query: ?resourceName=LeaveApplication&roleName=HR User&roleId=uuid&page=1&limit=50
 */
const getFilteredPermissions = catchAsync(async (req, res) => {
  const { resourceName, roleName, roleId, page, limit } = req.query;

  const result = await roleService.getFilteredPermissions({
    resourceName,
    roleName,
    roleId,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 50,
  });

  ok(res, {
    message: 'Permissions fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});


/**
 * GET /api/roles/permissions/by-resource/:resourceName
 *
 * Returns all permission rules for a specific resource across all active roles.
 */
const getPermissionsByResource = catchAsync(async (req, res) => {
  const { resourceName } = req.params;

  const permissions = await roleService.getPermissionsByResource(resourceName);

  ok(res, {
    message: `Permissions for "${resourceName}" fetched successfully`,
    data: permissions,
    meta: { total: permissions.length },
  });
});


/**
 * Get all roles assigned to a user
 * GET /roles/users/:userId/roles
 */
const getUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;
    const result = await roleService.getUserRoles(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'User roles fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * get all users with their assigned roles
 * GET /roles/users/with-roles
 */
const getUsersWithRoles = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await roleService.getUsersWithRoles({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'Users with roles fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * Assign roles to a user
 * POST /roles/users/:userId/roles
 */
const assignRolesToUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roleIds } = req.body;
    const result = await roleService.assignRolesToUser(userId, roleIds);
    ok(res, result.data, 'Roles assigned successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Replace all roles for a user
 * PUT /roles/users/:userId/roles
 */
const setUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roleIds } = req.body;
    const result = await roleService.setUserRoles(userId, roleIds);
    ok(res, result.data, 'Roles updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Remove a role from a user
 * DELETE /roles/users/:userId/roles/:roleId
 */
const revokeRoleFromUser = async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;
    await roleService.revokeRolesFromUser(userId, [roleId]);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRole,
  updateRole,
  deleteRole,
  getAvailableResources,
  getRolePermissions,
  upsertPermission,
  deletePermission,
  getUserRoles,
  assignRolesToUser,
  setUserRoles,
  revokeRoleFromUser,
  getUsersWithRoles,
  getAllResourceNames,
  getFilteredPermissions,
  getPermissionsByResource

};