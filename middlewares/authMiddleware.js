'use strict';

/**
 * middlewares/auth.middleware.js
 *
 * Verifies the Bearer JWT on every protected route and attaches
 * the decoded user payload to req.user so downstream middleware
 * and controllers never touch the token again.
 *
 * Usage in routes:
 *   const { authenticate } = require('../../middlewares/auth.middleware');
 *   router.get('/employees', authenticate, employeeController.list);
 *
 * req.user shape after authenticate():
 *   {
 *     id            : 'uuid',
 *     email         : 'user@example.com',
 *     isSystemManager: false,
 *     isSuperUser   : false,
 *     roleProfileId : 'uuid | null',
 *   }
 *
 * Install:  npm install jsonwebtoken
 */

const jwt    = require('jsonwebtoken');
const logger = require('../utils/logger');
const { unauthorized } = require('../utils/response');

const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_ISSUER      = process.env.JWT_ISSUER  || 'hrms-api';
const JWT_AUDIENCE    = process.env.JWT_AUDIENCE || 'hrms-client';

// ─────────────────────────────────────────────
//  SIGN  (used by user.service.js on login)
//
//  generateToken(payload, expiresIn?)
//  Returns a signed JWT string.
//
//  Usage:
//    const token = generateToken({ id: user.id, email: user.email, ... });
// ─────────────────────────────────────────────
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '8h') => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set in environment');

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer:   JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

// ─────────────────────────────────────────────
//  AUTHENTICATE  (Express middleware)
//
//  Rejects the request with 401 if:
//    — Authorization header is missing
//    — Token is malformed, expired, or signed with wrong secret
//  On success, sets req.user = decoded payload.
// ─────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Authorization header missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer:   JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Attach only the fields controllers need — never the raw token
    req.user = {
      id:              decoded.id,
      email:           decoded.email,
      isSystemManager: decoded.isSystemManager || false,
      isSuperUser:     decoded.isSuperUser     || false,
      roleProfileId:   decoded.roleProfileId   || null,
    };

    logger.debug('Authenticated', { userId: req.user.id, path: req.originalUrl });
    return next();

  } catch (err) {
    // jsonwebtoken throws named errors — the global error handler in
    // error.middleware.js maps JsonWebTokenError + TokenExpiredError to 401.
    // We re-throw here so that handler stays as the single mapping point.
    logger.warn('JWT verification failed', { error: err.message, path: req.originalUrl });
    return next(err);
  }
};

// ─────────────────────────────────────────────
//  OPTIONAL AUTHENTICATE
//
//  Same as authenticate but does NOT reject if
//  no token is present — req.user will be null.
//  Use on public endpoints that show richer data
//  when the caller is logged in (e.g. job portal).
// ─────────────────────────────────────────────
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer:   JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    req.user = {
      id:              decoded.id,
      email:           decoded.email,
      isSystemManager: decoded.isSystemManager || false,
      isSuperUser:     decoded.isSuperUser     || false,
      roleProfileId:   decoded.roleProfileId   || null,
    };
  } catch {
    req.user = null;
  }

  return next();
};

module.exports = {
  generateToken,
  authenticate,
  optionalAuthenticate,
};