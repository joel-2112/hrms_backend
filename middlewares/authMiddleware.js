'use strict';

/**
 * middlewares/auth.middleware.js
 *
 * Verifies the JWT from either:
 *   - Authorization: Bearer header (existing clients)
 *   - HTTP-only cookie (web browsers)
 *
 * Attaches decoded user payload to req.user and validates session.
 *
 * req.user shape after authenticate():
 *   {
 *     id            : 'uuid',
 *     email         : 'user@example.com',
 *     sessionId     : 'uuid',
 *     sessionToken  : 'string',
 *     isSystemManager: false,
 *     isSuperUser   : false,
 *     roleProfileId : 'uuid | null',
 *   }
 */

const logger = require('../utils/logger');
const { unauthorized } = require('../utils/response');
const { verifyToken } = require('../utils/jwt');
const authService = require('../modules/role/services/authService');

// ─────────────────────────────────────────────
//  HELPER: Extract token from request
//    Priority: 1. Cookie | 2. Authorization Header
// ─────────────────────────────────────────────
const extractToken = (req) => {
  // First try cookie (web browsers)
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }

  // Fallback to Authorization header (mobile apps, API clients)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

// ─────────────────────────────────────────────
//  AUTHENTICATE (Express middleware)
//
//  Rejects the request with 401 if:
//    — No token found in cookie or header
//    — Token is malformed, expired, or signed with wrong secret
//    — Session is invalid, expired, or terminated
//  On success, sets req.user with decoded payload.
// ─────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return unauthorized(res, 'Authentication required. Please log in.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Session expired. Please log in again.');
      }
      if (err.name === 'JsonWebTokenError') {
        return unauthorized(res, 'Invalid token. Please log in again.');
      }
      throw err;
    }

    // Validate session exists and is active (if sessionId is present in token)
    if (decoded.sessionId && decoded.sessionToken) {
      const isValid = await authService.validateSession(
        decoded.id,
        decoded.sessionId,
        decoded.sessionToken
      );

      if (!isValid) {
        return unauthorized(res, 'Session invalid or expired. Please log in again.');
      }
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      sessionId: decoded.sessionId || null,
      sessionToken: decoded.sessionToken || null,
      isSystemManager: decoded.isSystemManager || false,
      isSuperUser: decoded.isSuperUser || false,
      roleProfileId: decoded.roleProfileId || null,
    };

    logger.debug('Authenticated', { userId: req.user.id, path: req.originalUrl });
    return next();

  } catch (err) {
    logger.error('Authentication error', { error: err.message, path: req.originalUrl });
    return next(err);
  }
};

// ─────────────────────────────────────────────
//  OPTIONAL AUTHENTICATE
//
//  Same as authenticate but does NOT reject if
//  no token is present or validation fails.
//  req.user will be null if not authenticated.
// ─────────────────────────────────────────────
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      // Token invalid or expired — still continue, just without user
      req.user = null;
      return next();
    }

    // Validate session if present (don't reject, just set user if valid)
    let sessionValid = true;
    if (decoded.sessionId && decoded.sessionToken) {
      sessionValid = await authService.validateSession(
        decoded.id,
        decoded.sessionId,
        decoded.sessionToken
      );
    }

    if (sessionValid) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        sessionId: decoded.sessionId || null,
        sessionToken: decoded.sessionToken || null,
        isSystemManager: decoded.isSystemManager || false,
        isSuperUser: decoded.isSuperUser || false,
        roleProfileId: decoded.roleProfileId || null,
      };
    } else {
      req.user = null;
    }

    return next();

  } catch (err) {
    // On any error, just set user to null and continue
    req.user = null;
    return next();
  }
};

// ─────────────────────────────────────────────
//  SESSION REFRESH MIDDLEWARE
//
//  Call this on routes that should extend session expiry
//  on user activity (e.g., after each API call from frontend)
// ─────────────────────────────────────────────
const refreshUserSession = async (req, res, next) => {
  if (req.user && req.user.sessionId) {
    // Fire-and-forget — don't await, don't block response
    authService.refreshSession(req.user.sessionId).catch((err) => {
      logger.debug('Session refresh failed', { error: err.message, userId: req.user.id });
    });
  }
  next();
};

// ─────────────────────────────────────────────
//  REQUIRE SUPERUSER (admin-only routes)
// ─────────────────────────────────────────────
const requireSuperUser = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Authentication required');
  }
  if (!req.user.isSuperUser) {
    return res.status(403).json({ message: 'Superuser access required' });
  }
  next();
};

// ─────────────────────────────────────────────
//  REQUIRE SYSTEM MANAGER
// ─────────────────────────────────────────────
const requireSystemManager = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Authentication required');
  }
  if (!req.user.isSystemManager && !req.user.isSuperUser) {
    return res.status(403).json({ message: 'System Manager access required' });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  refreshUserSession,
  requireSuperUser,
  requireSystemManager,
};