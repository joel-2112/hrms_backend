'use strict';

/**
 * modules/role/services/authService.js
 *
 * Handles all authentication operations with:
 *   - Session tracking (active sessions per user)
 *   - Device fingerprinting (IP, User-Agent)
 *   - HTTP-only cookie JWT storage
 *   - Session blacklisting (logout, force logout)
 *   - Login attempt tracking (rate limiting)
 *   - Session expiry and cleanup
 */

const { Op } = require('sequelize');
const crypto = require('crypto');
const { User, Role, UserRole, RoleProfile, UserSession, LoginAttempt } = require('../../../models');
const { AppError } = require('../../../middlewares/errorMiddleware');
const { generateToken, verifyToken } = require('../../../middlewares/authMiddleware');

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY_DAYS = 7;
const CLEANUP_BATCH_SIZE = 1000;

// ─────────────────────────────────────────────
//  HELPER: Generate device fingerprint
// ─────────────────────────────────────────────
const generateDeviceFingerprint = (ip, userAgent) => {
  const data = `${ip}|${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// ─────────────────────────────────────────────
//  HELPER: Clean expired sessions (run daily via cron)
// ─────────────────────────────────────────────
const cleanupExpiredSessions = async () => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - SESSION_EXPIRY_DAYS);
  
  const deleted = await UserSession.destroy({
    where: {
      [Op.or]: [
        { expiresAt: { [Op.lt]: new Date() } },
        { lastActivityAt: { [Op.lt]: expiryDate } }
      ]
    },
    limit: CLEANUP_BATCH_SIZE
  });
  
  return deleted;
};

// ─────────────────────────────────────────────
//  HELPER: Record login attempt (for brute force protection)
// ─────────────────────────────────────────────
const recordLoginAttempt = async (email, ip, success) => {
  await LoginAttempt.create({
    email: email.toLowerCase().trim(),
    ipAddress: ip,
    success,
    attemptedAt: new Date()
  });
};

// ─────────────────────────────────────────────
//  HELPER: Check if account is locked
// ─────────────────────────────────────────────
const isAccountLocked = async (email) => {
  const lockWindow = new Date(Date.now() - LOCKOUT_DURATION_MS);
  
  const failedAttempts = await LoginAttempt.count({
    where: {
      email: email.toLowerCase().trim(),
      success: false,
      attemptedAt: { [Op.gt]: lockWindow }
    }
  });
  
  return failedAttempts >= MAX_LOGIN_ATTEMPTS;
};

// ─────────────────────────────────────────────
//  HELPER: Clear failed attempts on successful login
// ─────────────────────────────────────────────
const clearFailedAttempts = async (email) => {
  await LoginAttempt.destroy({
    where: {
      email: email.toLowerCase().trim(),
      success: false
    }
  });
};

// ─────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────
const register = async ({ firstName, middleName, lastName, email, password, roleIds = [] }, ip = null) => {
  if (!email || !password) throw new AppError('Email and password are required', 422);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 422);
  
  // Optional: password strength validation
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasNumber || !hasSpecial) {
    throw new AppError('Password must contain at least one number and one special character', 422);
  }

  const existing = await User.unscoped().findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw new AppError('A user with this email already exists', 409);

  const user = await User.create({
    firstName: firstName.trim(),
    middleName: middleName?.trim() || null,
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: password,
    status: 'Active',
  });

  if (roleIds?.length) {
    const roles = await Role.findAll({ where: { id: roleIds, disabled: false } });
    if (roles.length !== roleIds.length) {
      throw new AppError('One or more role IDs are invalid or disabled', 422);
    }
    await UserRole.bulkCreate(
      roles.map(r => ({ userId: user.id, roleId: r.id })),
      { ignoreDuplicates: true }
    );
  }

  // Record successful registration as login attempt
  if (ip) await recordLoginAttempt(email, ip, true);

  return User.findByPk(user.id);
};

// ─────────────────────────────────────────────
//  LOGIN (returns session data, token is set by controller in cookie)
// ─────────────────────────────────────────────
const login = async ({ email, password, ip, userAgent }) => {
  if (!email || !password) throw new AppError('Email and password are required', 422);

  // Check account lockout
  const locked = await isAccountLocked(email);
  if (locked) {
    await recordLoginAttempt(email, ip, false);
    throw new AppError(`Account locked. Too many failed attempts. Try again in ${LOCKOUT_DURATION_MS / 60000} minutes`, 429);
  }

  const user = await User.scope('withPassword').findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    await recordLoginAttempt(email, ip, false);
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status !== 'Active') {
    await recordLoginAttempt(email, ip, false);
    throw new AppError(`Account is ${user.status.toLowerCase()} — contact HR`, 403);
  }

  const valid = await user.verifyPassword(password);
  if (!valid) {
    await recordLoginAttempt(email, ip, false);
    throw new AppError('Invalid email or password', 401);
  }

  // Clear failed attempts on successful login
  await clearFailedAttempts(email);

  // Generate device fingerprint
  const deviceFingerprint = generateDeviceFingerprint(ip, userAgent);

  // Check for existing session from same device
  const existingSession = await UserSession.findOne({
    where: {
      userId: user.id,
      deviceFingerprint,
      isActive: true,
      expiresAt: { [Op.gt]: new Date() }
    }
  });

  let session;
  if (existingSession) {
    // Refresh existing session
    session = existingSession;
    session.lastActivityAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await session.save();
  } else {
    // Create new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    session = await UserSession.create({
      userId: user.id,
      sessionToken: crypto.randomBytes(32).toString('hex'),
      ipAddress: ip,
      userAgent: userAgent || null,
      deviceFingerprint,
      expiresAt,
      lastActivityAt: new Date(),
      isActive: true
    });
  }

  // Update user's last login
  await user.update({ lastLogin: new Date() }).catch(() => {});

  // Build JWT payload (includes session ID for tracking)
  const tokenPayload = {
    id: user.id,
    email: user.email,
    sessionId: session.id,
    sessionToken: session.sessionToken,
    isSystemManager: user.isSystemManager,
    isSuperUser: user.isSuperUser,
    roleProfileId: user.roleProfileId || null,
  };

  const token = generateToken(tokenPayload);
  const safeUser = await User.findByPk(user.id);

  // Record successful login
  await recordLoginAttempt(email, ip, true);

  return {
    token,
    user: safeUser,
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      deviceInfo: { ip, userAgent }
    }
  };
};

// ─────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────
const logout = async (userId, sessionId = null, allDevices = false) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  if (allDevices) {
    // Terminate all active sessions for this user
    await UserSession.update(
      { isActive: false, terminatedAt: new Date() },
      { where: { userId, isActive: true } }
    );
    return { message: 'All sessions terminated' };
  }

  if (sessionId) {
    // Terminate specific session
    const session = await UserSession.findOne({ where: { id: sessionId, userId } });
    if (session) {
      session.isActive = false;
      session.terminatedAt = new Date();
      await session.save();
    }
  }

  return { message: 'Logged out successfully' };
};

// ─────────────────────────────────────────────
//  GET ACTIVE SESSIONS (for user to view/manage)
// ─────────────────────────────────────────────
const getUserSessions = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const sessions = await UserSession.findAll({
    where: {
      userId,
      isActive: true,
      expiresAt: { [Op.gt]: new Date() }
    },
    attributes: ['id', 'ipAddress', 'userAgent', 'lastActivityAt', 'createdAt', 'expiresAt'],
    order: [['lastActivityAt', 'DESC']]
  });

  return sessions;
};

// ─────────────────────────────────────────────
//  TERMINATE SPECIFIC SESSION (for user)
// ─────────────────────────────────────────────
const terminateSession = async (userId, sessionId) => {
  const session = await UserSession.findOne({ where: { id: sessionId, userId, isActive: true } });
  if (!session) throw new AppError('Session not found or already terminated', 404);

  session.isActive = false;
  session.terminatedAt = new Date();
  await session.save();

  return { message: 'Session terminated successfully' };
};

// ─────────────────────────────────────────────
//  REFRESH SESSION (extend expiry on activity)
// ─────────────────────────────────────────────
const refreshSession = async (sessionId) => {
  const session = await UserSession.findOne({ where: { id: sessionId, isActive: true } });
  if (!session) return false;

  session.lastActivityAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await session.save();

  return true;
};

// ─────────────────────────────────────────────
//  VALIDATE SESSION (called by authMiddleware)
// ─────────────────────────────────────────────
const validateSession = async (userId, sessionId, sessionToken) => {
  const session = await UserSession.findOne({
    where: {
      id: sessionId,
      userId,
      sessionToken,
      isActive: true,
      expiresAt: { [Op.gt]: new Date() }
    }
  });

  if (!session) return false;

  // Update last activity (async, don't wait)
  session.lastActivityAt = new Date();
  session.save().catch(() => {});

  return true;
};

// ─────────────────────────────────────────────
//  GET ME
// ─────────────────────────────────────────────
const getMe = async (userId, sessionId = null) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'isSystemRole'],
      },
      {
        model: RoleProfile,
        as: 'RoleProfile',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!user) throw new AppError('User not found', 404);

  // Get current session info if provided
  let currentSession = null;
  if (sessionId) {
    const session = await UserSession.findOne({
      where: { id: sessionId, userId, isActive: true },
      attributes: ['id', 'ipAddress', 'userAgent', 'lastActivityAt', 'expiresAt']
    });
    if (session) currentSession = session;
  }

  const userObj = user.toJSON();
  if (currentSession) userObj.currentSession = currentSession;

  return userObj;
};

// ─────────────────────────────────────────────
//  CHANGE PASSWORD (terminates all other sessions)
// ─────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }, keepCurrentSession = true) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 422);
  }
  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 422);
  }
  
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  if (!hasNumber || !hasSpecial) {
    throw new AppError('New password must contain at least one number and one special character', 422);
  }
  
  if (currentPassword === newPassword) {
    throw new AppError('New password must differ from current password', 422);
  }

  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const valid = await user.verifyPassword(currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  await user.update({ passwordHash: newPassword });

  // Terminate all sessions except current one (security best practice)
  if (!keepCurrentSession) {
    await UserSession.update(
      { isActive: false, terminatedAt: new Date() },
      { where: { userId, isActive: true } }
    );
  }
};

// ─────────────────────────────────────────────
//  ADMIN: FORCE LOGOUT USER (terminate all sessions)
// ─────────────────────────────────────────────
const forceLogoutUser = async (userId, adminId = null) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const terminated = await UserSession.update(
    { isActive: false, terminatedAt: new Date(), terminatedBy: adminId },
    { where: { userId, isActive: true } }
  );

  return { message: `User force logged out. ${terminated[0]} session(s) terminated.` };
};

// ─────────────────────────────────────────────
//  ADMIN: GET ALL ACTIVE SESSIONS (system-wide)
// ─────────────────────────────────────────────
const getAllActiveSessions = async ({ page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await UserSession.findAndCountAll({
    where: {
      isActive: true,
      expiresAt: { [Op.gt]: new Date() }
    },
    include: [
      {
        model: User,
        attributes: ['id', 'email', 'firstName', 'lastName', 'status']
      }
    ],
    limit,
    offset,
    order: [['lastActivityAt', 'DESC']]
  });

  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

// ─────────────────────────────────────────────
//  CLEANUP EXPIRED SESSIONS (call via cron job)
// ─────────────────────────────────────────────
const cleanupSessions = async () => {
  return cleanupExpiredSessions();
};

module.exports = {
  register,
  login,
  logout,
  getUserSessions,
  terminateSession,
  refreshSession,
  validateSession,
  getMe,
  changePassword,
  forceLogoutUser,
  getAllActiveSessions,
  cleanupSessions,
};