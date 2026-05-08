const mongoose = require("mongoose");
const logger = require("./utils/logger");

// ── Connection state labels (Mongoose readyState codes) ─────────────────────
const STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const { withRetry } = require("./utils/reliability");

const connectMongoDB = async () => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000, // standard Atlas timeout
    socketTimeoutMS: 45000,
  };

  // Re-enable buffering but with a short timeout to prevent long hangs
  mongoose.set("bufferCommands", true);
  mongoose.set("bufferTimeoutMS", 5000); 

  try {
    await withRetry(async () => {
      logger.info("Attempting to connect to MongoDB...");
      await mongoose.connect(process.env.MONGO_URI, options);
    }, { 
      retries: 10, 
      minTimeout: 5000,
      onRetry: (err, attempt) => {
        logger.warn(`MongoDB Connection Attempt ${attempt} failed. Retrying...`);
      }
    });

    logger.info("Connected to MongoDB successfully");
  } catch (error) {
    const isAtlasUri = (process.env.MONGO_URI || "").includes("mongodb+srv");
    const redactedUri = (process.env.MONGO_URI || "").replace(/:([^@]+)@/, ":****@");
    
    if (isAtlasUri) {
      logger.error(
        `CRITICAL: MongoDB Atlas Connection Failed. Attempted URI: ${redactedUri}`
      );
      logger.error(
        "Hint: Ensure your IP is whitelisted AND the database user password is correct (check for special characters like '@' being URL-encoded)."
      );
    }
    logger.error("Final MongoDB Connection Error Detail:", error);
  }
};

// ── Monitor connection events ─────────────────────────────────────────────────
mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected. Attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected.");
});

mongoose.connection.on("error", (err) => {
  logger.error("MongoDB error event:", err.message);
});

/**
 * Returns a plain-object snapshot of the current DB connection health.
 * Used by the /api/health endpoint so callers can see DB state without logs.
 *
 * @returns {{ state: string, ready: boolean, host: string|null }}
 */
const getDbStatus = () => {
  const state = mongoose.connection.readyState;
  return {
    state: STATE_LABELS[state] || "unknown",
    ready: state === 1,
    host: mongoose.connection.host || null,
  };
};

module.exports = connectMongoDB;
module.exports.getDbStatus = getDbStatus;
