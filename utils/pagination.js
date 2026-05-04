

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT     = 100;


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