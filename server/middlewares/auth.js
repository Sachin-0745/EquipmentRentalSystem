const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");
const logger = require("../utils/logger");

const auth = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    logger.warn(`Auth Failed: No token provided for ${req.originalUrl}`);
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // Verify JWT signature & expiry first
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
  } catch (err) {
    logger.warn(`Auth Failed: ${err.message} for ${req.originalUrl}`);
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  // Check token_blacklist (logged-out tokens)
  try {
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: "Token has been revoked. Please log in again." });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Blacklist check error:", err);
    return res.status(500).json({ success: false, message: "Internal server error during authentication." });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

const isVendor = (req, res, next) => {
  if (req.user && req.user.role === "vendor") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Vendors only." });
  }
};

const isDeliveryBoy = (req, res, next) => {
  if (req.user && req.user.role === "delivery_boy") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Delivery personnel only." });
  }
};

module.exports = { auth, isAdmin, isVendor, isDeliveryBoy };
