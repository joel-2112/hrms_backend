'use strict';

const authService = require('../services/authService');
const { created, ok, noContent } = require('../../../utils/response');

// POST /register
const register = async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, email, password, roleIds } = req.body;
    const user = await authService.register({ firstName, middleName, lastName, email, password, roleIds });
    created(res, user, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

// POST /login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    ok(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// GET /me  (requires authenticate middleware)
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    ok(res, user, 'Profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /change-password  (requires authenticate middleware)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    noContent(res);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, changePassword };