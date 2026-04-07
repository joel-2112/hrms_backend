/**
 * utils/response.js
 *
 * Single source of truth for every JSON response the API sends.
 * Controllers never call res.json() directly — they go through
 * sendSuccess or sendError so the envelope is always consistent.
 *
 * Envelope shape:
 *
 *   Success
 *   {
 *     "success": true,
 *     "message": "Employees fetched successfully",
 *     "data":    { ... } | [ ... ] | null,
 *     "meta":    { "page": 1, "limit": 20, "total": 143 }  ← optional
 *   }
 *
 *   Error
 *   {
 *     "success": false,
 *     "message": "Validation failed",
 *     "errors":  [ { "field": "email", "message": "must be a valid email" } ]  ← optional
 *     "stack":   "..."   ← development only
 *   }
 */

'use strict';

// ─────────────────────────────────────────────
//  SUCCESS
// ─────────────────────────────────────────────

/**
 * sendSuccess(res, data, message, statusCode, meta)
 *
 * @param {import('express').Response} res
 * @param {*}      data        - payload (object, array, or null)
 * @param {string} message     - human-readable description
 * @param {number} statusCode  - HTTP status (default 200)
 * @param {object} meta        - optional pagination / extra metadata
 *
 * Usage examples:
 *   sendSuccess(res, employee, 'Employee fetched successfully');
 *   sendSuccess(res, employees, 'Employees fetched', 200, { page, limit, total });
 *   sendSuccess(res, null, 'Employee deleted successfully', 204);  // No Content
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const body = {
    success: true,
    message,
    data,
  };

  if (meta) body.meta = meta;

  return res.status(statusCode).json(body);
};

// ─────────────────────────────────────────────
//  ERROR
// ─────────────────────────────────────────────

/**
 * sendError(res, message, statusCode, errors, stack)
 *
 * @param {import('express').Response} res
 * @param {string}   message     - human-readable error summary
 * @param {number}   statusCode  - HTTP status (default 500)
 * @param {Array}    errors      - optional field-level error list
 * @param {string}   stack       - optional stack trace (dev only)
 *
 * Usage examples:
 *   sendError(res, 'Employee not found', 404);
 *   sendError(res, 'Validation failed', 422, [{ field: 'email', message: 'Invalid' }]);
 */
const sendError = (res, message = 'Internal server error', statusCode = 500, errors = null, stack = null) => {
  const body = {
    success: false,
    message,
  };

  if (errors && errors.length) body.errors = errors;

  // Only expose the stack trace in development — never in production
  if (stack && process.env.NODE_ENV === 'development') body.stack = stack;

  return res.status(statusCode).json(body);
};

// ─────────────────────────────────────────────
//  CONVENIENCE WRAPPERS
//  These cover the most common HTTP semantics
//  so controllers read like plain English.
// ─────────────────────────────────────────────

/** 200 OK — generic fetch */
const ok = (res, data, message = 'Success', meta = null) =>
  sendSuccess(res, data, message, 200, meta);

/** 201 Created — resource was created */
const created = (res, data, message = 'Created successfully') =>
  sendSuccess(res, data, message, 201);

/** 204 No Content — delete / action with no body */
const noContent = (res) =>
  res.status(204).send();

/** 400 Bad Request — malformed input the client should fix */
const badRequest = (res, message = 'Bad request', errors = null) =>
  sendError(res, message, 400, errors);

/** 401 Unauthorized — missing or invalid token */
const unauthorized = (res, message = 'Authentication required') =>
  sendError(res, message, 401);

/** 403 Forbidden — authenticated but not allowed */
const forbidden = (res, message = 'You do not have permission to perform this action') =>
  sendError(res, message, 403);

/** 404 Not Found — resource does not exist */
const notFound = (res, message = 'Resource not found') =>
  sendError(res, message, 404);

/** 409 Conflict — unique constraint violation, duplicate entry */
const conflict = (res, message = 'Resource already exists') =>
  sendError(res, message, 409);

/** 422 Unprocessable Entity — passed schema validation but business rules failed */
const unprocessable = (res, message = 'Validation failed', errors = null) =>
  sendError(res, message, 422, errors);

/** 500 Internal Server Error — unexpected server fault */
const serverError = (res, message = 'Internal server error', stack = null) =>
  sendError(res, message, 500, null, stack);

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  sendSuccess,
  sendError,

  // convenience wrappers
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
};