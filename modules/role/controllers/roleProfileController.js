// 'use strict';

const roleProfileService = require('../services/roleService');

const { ok, created, noContent } = require('../../../utils/response');

const createRoleProfile = async (req, res, next) => {
  try {
    const { name, roleIds } = req.body;
    const profile = await roleProfileService.createRoleProfile({ name, roleIds });
    created(res, profile, 'Role profile created successfully');
  } catch (err) {
    next(err);
  }
};

const getAllRoleProfiles = async (req, res, next) => {
  try {
    const { includeDisabled, page, limit } = req.query;
    const result = await roleProfileService.getAllRoleProfiles({
      includeDisabled: includeDisabled === 'true',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    ok(res, result.data, 'Role profiles fetched successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getRoleProfile = async (req, res, next) => {
  try {
    const profile = await roleProfileService.getRoleProfileById(req.params.id);
    ok(res, profile, 'Role profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateRoleProfile = async (req, res, next) => {
  try {
    const { name, disabled } = req.body;
    const profile = await roleProfileService.updateRoleProfile(req.params.id, { name, disabled });
    ok(res, profile, 'Role profile updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteRoleProfile = async (req, res, next) => {
  try {
    await roleProfileService.deleteRoleProfile(req.params.id);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

const setProfileRoles = async (req, res, next) => {
  try {
    const { roleIds } = req.body;
    const profile = await roleProfileService.setRoleProfileRoles(req.params.id, roleIds);
    ok(res, profile, 'Profile roles updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRoleProfile,
  getAllRoleProfiles,
  getRoleProfile,
  updateRoleProfile,
  deleteRoleProfile,
  setProfileRoles,
};