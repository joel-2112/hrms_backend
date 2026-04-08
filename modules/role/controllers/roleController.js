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

module.exports = {
  createRole,
  getAllRoles,
  getRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  upsertPermission,
  deletePermission,
};