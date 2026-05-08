/**
 * utils/pagination.js
 * ─────────────────────────────────────────────────────────────
 * Helper functions to extract pagination params from query strings
 * and build standardised paginated response envelopes.
 *
 * Standard response shape:
 * {
 *   "success": true,
 *   "data": [...],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "totalItems": 200,
 *     "totalPages": 20,
 *     "hasNextPage": true,
 *     "hasPrevPage": false
 *   }
 * }
 */

const DEFAULT_LIMIT = 12;
const MAX_LIMIT     = 100;

/**
 * Parse and validate page / limit from req.query.
 * @param {object} query – req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a standard paginated JSON response.
 * @param {object} res          – Express response object
 * @param {Array}  data         – array of records for the current page
 * @param {number} totalItems   – total matching rows (from COUNT(*))
 * @param {number} page
 * @param {number} limit
 */
function paginatedResponse(res, data, totalItems, page, limit) {
  const totalPages = Math.ceil(totalItems / limit);
  return res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

module.exports = { parsePagination, paginatedResponse, DEFAULT_LIMIT };
