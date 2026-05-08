const NodeCache = require("node-cache");
const redis = require("../config/redis");
const logger = require("../utils/logger");

// Local in-memory store remains as a fast fallback (Task 2.2 fallback)
const store = new NodeCache({ stdTTL: 120, checkperiod: 60, useClones: false });

/**
 * Express middleware factory for caching GET responses.
 * Implements Redis-first strategy with local fallback.
 */
const cache = (ttlSeconds = 120, keyPrefix = "") => async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== "GET") return next();

  const key = `${keyPrefix || req.originalUrl}`;

  // ── Task 2.2: Redis First Strategy ─────────────────────────────────────────
  if (redis && redis.status === "ready") {
    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT-REDIS");
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      logger.warn(`Redis GET error for key ${key}: ${err.message}. Falling back.`);
    }
  }

  // ── Local Fallback ──────────────────────────────────────────────────────────
  const localCached = store.get(key);
  if (localCached !== undefined) {
    res.setHeader("X-Cache", "HIT-LOCAL");
    return res.json(localCached);
  }

  // Intercept res.json to store the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses (Task 2.3)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(key, body, ttlSeconds);

      if (redis && redis.status === "ready") {
        redis.set(key, JSON.stringify(body), "EX", ttlSeconds)
          .catch(err => logger.warn(`Redis SET error: ${err.message}`));
      }
    }
    res.setHeader("X-Cache", "MISS");
    return originalJson(body);
  };

  next();
};

/**
 * Task 2.4: Cache Invalidation (Cross-layer)
 */
const invalidateCache = async (pattern) => {
  // 1. Invalidate local store
  const keys = store.keys();
  const toDeleteLocal = keys.filter((k) => k.includes(pattern));
  if (toDeleteLocal.length) {
    store.del(toDeleteLocal);
  }

  // 2. Invalidate Redis
  if (redis && redis.status === "ready") {
    try {
      // Find keys using SCAN (Safer than KEYS *)
      let cursor = '0';
      let count = 0;
      do {
        const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', `*${pattern}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (foundKeys.length) {
          await redis.del(foundKeys);
          count += foundKeys.length;
        }
      } while (cursor !== '0');
      
      if (count > 0) {
        logger.info(`[Cache] Invalidated ${toDeleteLocal.length} local and ${count} redis keys for pattern "${pattern}"`);
      }
    } catch (err) {
      logger.warn(`Redis invalidation error: ${err.message}`);
    }
  } else if (toDeleteLocal.length) {
    logger.info(`[Cache] Invalidated ${toDeleteLocal.length} local keys matching "${pattern}"`);
  }
};

const flushCache = async () => {
  store.flushAll();
  if (redis && redis.status === "ready") {
    await redis.flushdb();
  }
};

const cacheStats = () => ({
  local: store.getStats(),
  redis: redis ? redis.status : "disconnected"
});

module.exports = { cache, invalidateCache, flushCache, cacheStats };
