/**
 * middlewares/error.middleware.js
 *
 * Global error handler. Mount this LAST in app.js, after all routes:
 *
 *   app.use(notFoundHandler);   // catches unmatched routes → 404
 *   app.use(errorHandler);      // catches everything thrown / next(err)'d
 *
 * Every error that reaches here is mapped to a consistent JSON envelope
 * via sendError from utils/response.js. No raw Express error pages ever
 * reach the client.
 *
 * Sequelize error classes handled:
 *   ValidationError          → 422  (model-level validations, e.g. isEmail)
 *   UniqueConstraintError    → 409  (duplicate unique column)
 *   ForeignKeyConstraintError→ 409  (FK violation — ref doesn't exist)
 *   DatabaseError            → 400  (bad query, wrong type, etc.)
 *   ConnectionError          → 503  (DB unreachable)
 *   EmptyResultError         → 404  (findOrFail returned nothing)
 *   TimeoutError             → 503  (pool acquire timeout)
 *
 * Application error classes handled:
 *   AppError (custom)        → whatever statusCode was set on the instance
 */

'use strict';

const { sendError } = require('../utils/response');

// ─────────────────────────────────────────────
//  CUSTOM APPLICATION ERROR
//  Throw this anywhere in services / controllers
//  to produce a specific HTTP status without
//  having to touch res directly.
//
//  Usage:
//    throw new AppError('Employee not found', 404);
//    throw new AppError('Insufficient leave balance', 422);
// ─────────────────────────────────────────────
class AppError extends Error {
  /**
   * @param {string}  message     - human-readable description
   * @param {number}  statusCode  - HTTP status code
   * @param {Array}   errors      - optional field-level detail
   */
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.errors     = errors;
    this.isOperational = true; // flag: this is an expected, handled error
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────
//  SEQUELIZE ERROR MAP
//  Maps Sequelize error class names to
//  { statusCode, message } pairs.
//  We check by name rather than instanceof so
//  this file does not need to import Sequelize.
// ─────────────────────────────────────────────
const SEQUELIZE_ERROR_MAP = {
  SequelizeValidationError:           { status: 422, message: 'Validation failed'                   },
  SequelizeUniqueConstraintError:     { status: 409, message: 'A record with that value already exists' },
  SequelizeForeignKeyConstraintError: { status: 409, message: 'Related resource does not exist'     },
  SequelizeDatabaseError:             { status: 400, message: 'Database error'                      },
  SequelizeConnectionError:           { status: 503, message: 'Database connection failed'          },
  SequelizeConnectionRefusedError:    { status: 503, message: 'Database connection refused'         },
  SequelizeConnectionTimedOutError:   { status: 503, message: 'Database connection timed out'       },
  SequelizeEmptyResultError:          { status: 404, message: 'Resource not found'                  },
  SequelizeTimeoutError:              { status: 503, message: 'Database request timed out'          },
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/**
 * Extracts field-level error detail from a SequelizeValidationError
 * so the client knows exactly which fields failed and why.
 *
 * Returns:
 *   [ { field: 'email', message: 'must be a valid email address' }, ... ]
 */
const extractValidationErrors = (err) =>
  (err.errors || []).map((e) => ({
    field:   e.path   || 'unknown',
    message: e.message || 'Invalid value',
  }));

/**
 * Extracts field info from a SequelizeUniqueConstraintError.
 * Sequelize surfaces the conflicting fields in err.fields.
 *
 * Returns:
 *   [ { field: 'email', message: 'email already exists' } ]
 */
const extractUniqueErrors = (err) => {
  if (!err.fields) return null;
  return Object.keys(err.fields).map((field) => ({
    field,
    message: `${field} already exists`,
  }));
};

// ─────────────────────────────────────────────
//  404 HANDLER — unmatched routes
//  Mount BEFORE errorHandler in app.js
// ─────────────────────────────────────────────
const notFoundHandler = (req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

// ─────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
//  Express identifies this as an error handler
//  because it has exactly 4 parameters (err, req, res, next).
//  Mount LAST in app.js after all routes and notFoundHandler.
// ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // ── 1. AppError (intentionally thrown by our own code) ────────────
  if (err.isOperational && err.name === 'AppError') {
    return sendError(
      res,
      err.message,
      err.statusCode,
      err.errors,
      isDev ? err.stack : null,
    );
  }

  // ── 2. Sequelize errors ────────────────────────────────────────────
  const seqMeta = SEQUELIZE_ERROR_MAP[err.name];
  if (seqMeta) {
    let errors = null;

    if (err.name === 'SequelizeValidationError') {
      errors = extractValidationErrors(err);
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      errors = extractUniqueErrors(err);
    }

    // FK violations: surface the table + constraint so developers can debug
    let message = seqMeta.message;
    if (err.name === 'SequelizeForeignKeyConstraintError' && isDev) {
      message = `${message} (table: ${err.table || '?'}, constraint: ${err.index || '?'})`;
    }

    return sendError(
      res,
      message,
      seqMeta.status,
      errors,
      isDev ? err.stack : null,
    );
  }

  // ── 3. JWT errors (from jsonwebtoken library) ──────────────────────
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid or malformed token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired — please log in again', 401);
  }
  if (err.name === 'NotBeforeError') {
    return sendError(res, 'Token is not yet valid', 401);
  }

  // ── 4. Multer errors (file uploads) ───────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File is too large', 413);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field', 400);
  }

  // ── 5. Syntax errors (malformed JSON body) ────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON in request body', 400);
  }

  // ── 6. Unknown / unexpected errors ────────────────────────────────
  //    Log the full error server-side so it can be investigated.
  //    Never expose internals to the client in production.
  console.error('[Unhandled Error]', {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    url:     req.originalUrl,
    method:  req.method,
  });

  return sendError(
    res,
    isDev ? err.message : 'An unexpected error occurred',
    err.statusCode || 500,
    null,
    isDev ? err.stack : null,
  );
};

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};