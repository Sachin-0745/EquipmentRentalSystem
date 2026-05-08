const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  // Determine status code
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  // Specific handling for Database Connectivity issues
  if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering timed out') || err.message.includes('not connected')) {
    statusCode = 503; // Service Unavailable
    message = "Database connection failed. If using MongoDB Atlas, please ensure your IP address is whitelisted.";
  }

  // Format the response
  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
