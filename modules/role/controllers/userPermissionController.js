// 'use strict';

const roleService = require('../services/roleService');
const { ok, created, noContent } = require('../../../utils/response');

const addUserPermission = async (req, res, next) => {
  try {
    const { allowDocType, allowValue, applyToAllDocTypes } = req.body;
    const permission = await roleService.addUserPermission(req.params.userId, {
      allowDocType,
      allowValue,
      applyToAllDocTypes
    });
    created(res, permission, 'User permission added successfully');
  } catch (err) {
    next(err);
  }
};

const getUserPermissions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await roleService.getUserPermissions(req.params.userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'User permissions fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getAllUserPermissionsWithUser = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await roleService.getAllUserPermissionsWithUser(req.params.userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'User permissions with user details fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const deleteUserPermission = async (req, res, next) => {
  try {
    await roleService.deleteUserPermission(req.params.permissionId);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

const replaceUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const result = await roleService.replaceUserPermissions(req.params.userId, permissions);
    ok(res, result.data, 'User permissions replaced successfully');
  } catch (err) {
    next(err);
  }
};

const getUserEffectivePermissions = async (req, res, next) => {
  try {
    const effective = await roleService.getUserEffectivePermissions(req.params.userId);
    ok(res, effective, 'Effective permissions fetched successfully');
  } catch (err) {
    next(err);
  }
};



module.exports = {
  addUserPermission,
  getUserPermissions,
  deleteUserPermission,
  replaceUserPermissions,
  getUserEffectivePermissions,
  getAllUserPermissionsWithUser,
};