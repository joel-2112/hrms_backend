// 'use strict';

const roleService = require('../services/roleService');
const { ok, created, noContent, notFound, conflict, unprocessable } = require('../../../utils/response');

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

// Add after the existing functions (before module.exports)

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
  getRolePermissions,
  upsertPermission,
  deletePermission,
  getUserRoles,
  assignRolesToUser,
  revokeRoleFromUser,

};