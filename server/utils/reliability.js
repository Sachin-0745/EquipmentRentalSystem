const retry = require("async-retry");
const CircuitBreaker = require("opossum");
const logger = require("./logger");

/**
 * Task 3.1: Retry Logic with Exponential Backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 */
exports.withRetry = async (fn, options = {}) => {
  return await retry(fn, {
    retries: options.retries || 3,
    factor: 2,
    minTimeout: 1000,
    onRetry: (error, attempt) => {
      logger.warn(`Retry attempt ${attempt} due to error: ${error.message}`);
    },
    ...options
  });
};

/**
 * Task 3.2: Circuit Breaker Pattern
 * Prevents cascading failures when a downstream service (or DB) is struggling.
 */
const breakerOptions = {
  timeout: 5000,        // If function takes longer than 5s, trigger failure
  errorThresholdPercentage: 50, // Critical threshold
  resetTimeout: 30000   // Wait 30s before trying again
};

exports.createBreaker = (fn, name = "default") => {
  const breaker = new CircuitBreaker(fn, breakerOptions);

  breaker.on("open", () => logger.error(`Circuit Breaker [${name}] is OPEN`));
  breaker.on("halfOpen", () => logger.warn(`Circuit Breaker [${name}] is HALF-OPEN`));
  breaker.on("close", () => logger.info(`Circuit Breaker [${name}] is CLOSED`));
  
  // Fallback if circuit is open
  breaker.fallback(() => {
    logger.warn(`Circuit Breaker [${name}] active: Returning fallback/error`);
    throw new Error(`Service ${name} is temporarily unavailable (Circuit Open)`);
  });

  return breaker;
};
