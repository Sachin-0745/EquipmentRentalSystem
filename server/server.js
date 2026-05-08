const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
const connectMongoDB = require("./mongoDB");

// ── Startup Initialization ──────────────────────────────────────────────
const start = () => {
  const connectMongoDB = require("./mongoDB");
  connectMongoDB(); // Don't await here

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info("Server running on port " + PORT);
  });

  // Initialize Socket.io
  require("./utils/socket").init(server);
};


const logger = require("./utils/logger");
const asyncHandler = require("./utils/asyncHandler");
const { auth, isAdmin, isVendor, isDeliveryBoy } = require("./middlewares/auth");
const { getDistance } = require("./utils/distance");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { ok, fail, serverError } = require("./utils/response");

// ── Performance & Security middleware ─────────────────────────────────────
const helmet       = require("helmet");
const morgan       = require("morgan");
const compression  = require("compression");                          // gzip/br
const sanitize     = require("./middlewares/sanitize");
const errorHandler = require("./middlewares/errorHandler");
const { authLimiter, otpLimiter, apiLimiter, uploadLimiter } = require("./middlewares/rateLimiter");
const { cache, invalidateCache, cacheStats } = require("./middlewares/cache");
const { parsePagination, paginatedResponse } = require("./utils/pagination");
const setupSwagger = require("./config/swagger");
const { processImage } = require("./utils/imageProcessor");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

// ── Core middleware stack ──────────────────────────────────────────────────
// Response compression — gzip for text, auto-negotiates br where supported

// ── API Timeout Handling ──────────────────────────────────────────────────
const timeoutMiddleware = (req, res, next) => {
  req.setTimeout(30000, () => {
    const err = new Error('Request Timeout');
    err.statusCode = 408;
    next(err);
  });
  res.setTimeout(30000, () => {
    const err = new Error('Response Timeout');
    err.statusCode = 408;
    next(err);
  });
  next();
};
app.use(timeoutMiddleware);

app.use(compression({ level: 6, threshold: 1024 }));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:5000"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // ── Fix: Disable HSTS on localhost to prevent SSL alert 80 ──────────────
  hsts: process.env.NODE_ENV === "production",
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(cookieParser());

// HTTP request logger + response-time tracking
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── API Response-time header (X-Response-Time) ─────────────────────────────
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (ms > 500) {
      // Log slow queries (>500 ms) for monitoring
      logger.warn(`[SLOW] ${req.method} ${req.originalUrl} — ${ms.toFixed(1)}ms`);
    }
  });
  res.setHeader("X-Response-Time", "measured");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Setup API Documentation ────────────────────────────────────────────────
setupSwagger(app);

// XSS sanitize all string inputs before any handler runs
app.use(sanitize);

// Serve uploads — with caching headers (1 day for processed images)
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "1d",
  etag: true,
  lastModified: true,
}));

// Create uploads and processed sub-directories if they don't exist
const uploadDir    = path.join(__dirname, "uploads");
const processedDir = path.join(__dirname, "uploads", "processed");
if (!fs.existsSync(uploadDir))    fs.mkdirSync(uploadDir,    { recursive: true });
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

// ── MULTER: Equipment Images (jpg/jpeg/png, max 150 KB, UUID filename) ──────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img_${uuidv4()}${ext}`);
  },
});
const imageFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, JPEG, and PNG images are allowed."), false);
  }
  cb(null, true);
};
const upload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 150 * 1024 }, // 150 KB — spec requirement
});

// ── MULTER: Documents (PDF only, max 150 KB, UUID filename) ─────────────────
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, `doc_${uuidv4()}.pdf`);
  },
});
const docFileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF documents are allowed."), false);
  }
  cb(null, true);
};
const uploadDoc = multer({
  storage: docStorage,
  fileFilter: docFileFilter,
  limits: { fileSize: 150 * 1024 }, // 150 KB — spec requirement
});

// ── Global multer error handler (must stay near the top of middleware stack) ─
const handleMulterError = (err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File exceeds the 150 KB size limit." });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || "Invalid file type or upload error." });
  }
  next();
};

const authRoutes = require("./routes/auth");

// ── Validation rules ──────────────────────────────────────────────────────
const {
  validate,
  productCreateRules, productUpdateRules,
  cartAddRules, checkoutRules, reviewRules,
  profileUpdateRules, vendorRequestRules, idParamRules,
} = require("./middlewares/validate");

// ── Apply rate limiter to all /api routes ─────────────────────────────────
app.use("/api", apiLimiter);

// ── Auth routes (with strict rate limiter) ────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);

// ── Modular Routes ────────────────────────────────────────────────────────
const equipmentRoutes = require("./routes/equipment");
app.use("/api/equipment", equipmentRoutes);

const cartRoutes = require("./routes/cart");
app.use("/api/cart", cartRoutes);

const categoryRoutes = require("./routes/category");
app.use("/api/categories", categoryRoutes);

const deliveryRoutes = require("./routes/delivery");
app.use("/api/delivery", deliveryRoutes);

const notificationRoutes = require("./routes/notification");
app.use("/api/notifications", notificationRoutes);

const reviewRoutes = require("./routes/review");
app.use("/api", reviewRoutes);

const returnRoutes = require("./routes/return");
app.use("/api/returns", returnRoutes);

const paymentRoutes = require("./routes/payment");
app.use("/api/payment", paymentRoutes);

app.get("/api/health", (req, res) => {
  const { getDbStatus } = require("./mongoDB");
  const db = getDbStatus();
  const statusCode = db.ready ? 200 : 503;
  res.status(statusCode).json({
    status: db.ready ? "OK" : "DEGRADED",
    timestamp: new Date(),
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      state: db.state,
      ready: db.ready,
      host: db.host,
      // Remind operators about Atlas IP whitelisting if DB is offline
      hint: !db.ready
        ? "DB offline — if using Atlas, go to Network Access → Add Current IP"
        : null,
    },
  });
});

const rentalRoutes = require("./routes/rental");
app.use("/api", rentalRoutes);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

const vendorRoutes = require("./routes/vendor");
app.use("/api/vendor", vendorRoutes);

const userRoutes = require("./routes/user");
app.use("/api/user", userRoutes);

// ── Centralized error handler (MUST be last app.use) ──────────────────────
app.use(errorHandler);

// Start the server
start();
