'use strict';

/**
 * utils/jwt.js
 *
 * Centralized JWT handling to avoid circular dependencies between
 * authMiddleware and authService.
 *
 * All token generation and verification happens here.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'hrms-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'hrms-client';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

/**
 * Generate a JWT token
 * @param {Object} payload - Data to encode in token
 * @param {string} expiresIn - Token expiry (default from env or '7d')
 * @returns {string} Signed JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token is expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

/**
 * Decode a JWT token without verification (for debugging only)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};