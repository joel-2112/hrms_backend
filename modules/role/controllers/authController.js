'use strict';

/**
 * modules/role/controllers/authController.js
 *
 * Handles HTTP requests for authentication:
 *   register, login, logout, getMe, changePassword
 *   session management (view sessions, terminate sessions)
 */

const authService = require('../services/authService');
const { created, ok, noContent } = require('../../../utils/response');

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ─────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, email, password, roleIds } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    const user = await authService.register(
      { firstName, middleName, lastName, email, password, roleIds },
      ip
    );
    
    created(res, user, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  LOGIN (sets HTTP-only cookie)
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const { token, user, session } = await authService.login({
      email,
      password,
      ip,
      userAgent
    });
    
    // Set JWT as HTTP-only cookie
    res.cookie('authToken', token, COOKIE_CONFIG);
    
    // Also return user and session info in response body for client reference
    ok(res, { user, session }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  LOGOUT (clears cookie, terminates session)
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.user?.sessionId;
    const { allDevices } = req.query; // ?allDevices=true
    
    if (userId) {
      await authService.logout(userId, sessionId, allDevices === 'true');
    }
    
    // Clear the cookie
    res.clearCookie('authToken', COOKIE_CONFIG);
    
    noContent(res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  GET ME (with current session info)
// ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id, req.user.sessionId);
    ok(res, user, 'Profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  GET MY ACTIVE SESSIONS
// ─────────────────────────────────────────────
const getMySessions = async (req, res, next) => {
  try {
    const sessions = await authService.getUserSessions(req.user.id);
    ok(res, sessions, 'Active sessions fetched successfully');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  TERMINATE A SPECIFIC SESSION (except current)
// ─────────────────────────────────────────────
const terminateMySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    // Prevent terminating current session
    if (sessionId === req.user.sessionId) {
      return res.status(400).json({ message: 'Cannot terminate current session. Use logout instead.' });
    }
    
    await authService.terminateSession(req.user.id, sessionId);
    noContent(res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  CHANGE PASSWORD (clears all other sessions)
// ─────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, terminateAllDevices = true } = req.body;
    
    await authService.changePassword(
      req.user.id,
      { currentPassword, newPassword },
      !terminateAllDevices  // keepCurrentSession = false if terminateAllDevices is true
    );
    
    noContent(res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  ADMIN: FORCE LOGOUT A USER
// ─────────────────────────────────────────────
const forceLogoutUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;
    
    const result = await authService.forceLogoutUser(userId, adminId);
    ok(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  ADMIN: GET ALL ACTIVE SESSIONS
// ─────────────────────────────────────────────
const getAllActiveSessions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await authService.getAllActiveSessions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });
    ok(res, result.data, 'Active sessions fetched', result.meta);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  getMySessions,
  terminateMySession,
  changePassword,
  forceLogoutUser,
  getAllActiveSessions,
};