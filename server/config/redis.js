const Redis = require("ioredis");
const logger = require("../utils/logger");

// Task 2.1: Setup Redis with fallback logic
let redis = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    redis = new Redis(process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on("connect", () => logger.info("Connected to Redis successfully"));
    redis.on("error", (err) => {
      logger.error("Redis connection error:", err.message);
      // We don't exit process; system should fallback to in-memory/DB
    });
  } catch (err) {
    logger.error("Failed to initialize Redis client:", err.message);
  }
} else {
  logger.warn("REDIS_URL not found. Scaling will rely on in-memory fallback.");
}

module.exports = redis;
