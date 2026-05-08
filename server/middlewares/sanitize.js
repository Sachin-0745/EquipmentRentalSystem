/**
 * middlewares/sanitize.js
 * XSS sanitization middleware — strips HTML/script tags from all string inputs.
 * Applied globally before any route handler processes req.body.
 */
const xss = require("xss");

/**
 * Recursively sanitize all string values in an object/array.
 */
function deepSanitize(value) {
  if (typeof value === "string") {
    return xss(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (value && typeof value === "object") {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = deepSanitize(value[key]);
    }
    return sanitized;
  }
  return value; // number, boolean, null — pass through unchanged
}

/**
 * Express middleware: sanitize req.body, req.params, req.query
 */
const sanitizeInputs = (req, res, next) => {
  if (req.body)   req.body   = deepSanitize(req.body);
  if (req.params) req.params = deepSanitize(req.params);
  if (req.query)  req.query  = deepSanitize(req.query);
  next();
};

module.exports = sanitizeInputs;
