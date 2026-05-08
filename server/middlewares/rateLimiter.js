/**
 * middlewares/rateLimiter.js
 * Configures rate limiters for different route groups.
 * Protects against brute-force, scraping, and DoS.
 */
const rateLimit = require("express-rate-limit");

// ── Helper: standard JSON response on limit breach ──────────────────────────
const limiterHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

/**
 * authLimiter — tight limit for login/signup/OTP
 * 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Increased from 5
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
  skipSuccessfulRequests: true, // only count failed attempts
});

/**
 * otpLimiter — stricter for OTP to prevent enumeration
 * 50 attempts per 10 minutes per IP
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50, // Increased from 3
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
});

/**
 * apiLimiter — general rate limit for all API routes
 * 1000 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 200
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
});

/**
 * uploadLimiter — limit file upload attempts
 * 50 uploads per 10 minutes per IP
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50, // Increased from 10
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
});

module.exports = { authLimiter, otpLimiter, apiLimiter, uploadLimiter };
