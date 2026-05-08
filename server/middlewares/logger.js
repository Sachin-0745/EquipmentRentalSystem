/**
 * middlewares/logger.js
 * Winston structured logger — replaces console.log in production
 */
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize, errors } = format;
const path = require("path");

const logDir = path.join(__dirname, "../logs");
const fs = require("fs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console — colour in dev, plain in prod
    new transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
    }),
    // Persistent error log
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),
    // Combined log (all levels)
    new transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
