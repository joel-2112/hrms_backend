'use strict';

/**
 * utils/pagination.js
 *
 * Centralises all pagination logic so every list endpoint
 * behaves identically — same query params, same meta envelope.
 *
 * Usage in a service:
 *
 *   const { getPaginationOptions, buildMeta } = require('../../utils/pagination');
 *
 *   async function listEmployees(query) {
 *     const { limit, offset, page } = getPaginationOptions(query);
 *
 *     const { count, rows } = await Employee.findAndCountAll({
 *       where:  { companyId },
 *       limit,
 *       offset,
 *       order:  [['createdAt', 'DESC']],
 *     });
 *
 *     return {
 *       data: rows,
 *       meta: buildMeta(count, page, limit),
 *     };
 *   }
 *
 * Usage in a controller:
 *
 *   const { data, meta } = await employeeService.listEmployees(req.query);
 *   return ok(res, data, 'Employees fetched successfully', meta);
 *
 * Query params recognised:
 *   ?page=2&limit=25
 *
 * Defaults:  page = 1, limit = 10
 * Hard cap:  limit ≤ 100  (prevents accidental full-table fetches)
 */

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT     = 100;

// ─────────────────────────────────────────────
//  getPaginationOptions
//
//  Parses and sanitises page + limit from the
//  raw Express query object. Returns the three
//  values Sequelize's findAndCountAll needs.
//
//  @param  {object} query   - req.query
//  @returns {{ page, limit, offset }}
// ─────────────────────────────────────────────
const getPaginationOptions = (query = {}) => {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  // Sanitise: fall back to defaults if missing, zero, or non-numeric
  if (!page  || page  < 1) page  = DEFAULT_PAGE;
  if (!limit || limit < 1) limit = DEFAULT_LIMIT;

  // Hard cap — never allow a client to fetch more than MAX_LIMIT rows
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

// ─────────────────────────────────────────────
//  buildMeta
//
//  Constructs the `meta` object that goes into
//  the sendSuccess envelope.
//
//  @param  {number} total  - count from findAndCountAll
//  @param  {number} page   - current page
//  @param  {number} limit  - rows per page
//  @returns {object} meta
// ─────────────────────────────────────────────
const buildMeta = (total, page, limit) => {
  const totalPages  = Math.ceil(total / limit);
  const hasNext     = page < totalPages;
  const hasPrevious = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrevious,
  };
};

// ─────────────────────────────────────────────
//  paginateQuery  (convenience — combines both)
//
//  Call this when you want to parse the query
//  AND get back a ready-to-use Sequelize options
//  object in one step.
//
//  Usage:
//    const { sequelizeOpts, page, limit } = paginateQuery(req.query);
//    const { count, rows } = await Model.findAndCountAll({
//      ...sequelizeOpts,
//      where: { ... },
//    });
//    return { data: rows, meta: buildMeta(count, page, limit) };
// ─────────────────────────────────────────────
const paginateQuery = (query = {}) => {
  const { page, limit, offset } = getPaginationOptions(query);
  return {
    sequelizeOpts: { limit, offset },
    page,
    limit,
  };
};

module.exports = {
  getPaginationOptions,
  buildMeta,
  paginateQuery,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};