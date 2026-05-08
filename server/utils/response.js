/**
 * utils/response.js
 * Standardized API response helpers.
 * All routes should use these instead of res.json({}) directly.
 */

/**
 * Success response
 * @param {object} res - Express response object
 * @param {*} data - Payload to return
 * @param {string} message - Optional message
 * @param {number} statusCode - HTTP status (default 200)
 */
const ok = (res, data = null, message = "Success", statusCode = 200) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

/**
 * Error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status (default 400)
 */
const fail = (res, message = "An error occurred", statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Server error response (500)
 */
const serverError = (res, err) => {
  const msg = typeof err === "string" ? err : err?.message || "Internal Server Error";
  return res.status(500).json({ success: false, message: msg });
};

module.exports = { ok, fail, serverError };
