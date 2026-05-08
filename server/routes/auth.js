const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const auth = require("../controllers/authController");
const { auth: authMiddleware } = require("../middlewares/auth");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const docStorage = process.env.CLOUDINARY_CLOUD_NAME 
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "equiprent_docs",
        format: async (req, file) => "pdf",
        resource_type: "raw"
      }
    })
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, "uploads/"),
      filename: (req, file, cb) => cb(null, Date.now() + "-doc-" + file.originalname.replace(/\s/g, "_")),
    });

const uploadDoc = multer({
  storage: docStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf")
      return cb(new Error("Only PDF documents are allowed."), false);
    cb(null, true);
  },
  limits: { fileSize: 150 * 1024 }, // 150 KB strict limit
}).fields([
  { name: "document", maxCount: 1 },
  { name: "id_proof", maxCount: 1 }
]);

// Wraps multer so errors surface as JSON
const handleDocUpload = (req, res, next) => {
  uploadDoc(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || "Document upload failed" });
    next();
  });
};

const {
  validate,
  signupRules,
  applicationRules,
  loginRules
} = require("../middlewares/validate");


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, mobile_no]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 12 }
 *               mobile_no: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/signup", signupRules, validate, auth.signup);

/**
 * @swagger
 * /auth/vendor-signup:
 *   post:
 *     summary: Register as a vendor (requires document upload)
 *     tags: [Auth]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: document
 *         type: file
 *         description: Proof of identity (PDF)
 *     responses:
 *       201:
 *         description: Vendor request submitted
 */
router.post("/vendor-signup", handleDocUpload, applicationRules, validate, auth.vendorSignup);

/**
 * @swagger
 * /auth/delivery-signup:
 *   post:
 *     summary: Register as a delivery partner (requires document upload)
 *     tags: [Auth]
 *     consumes:
 *       - multipart/form-data
 *     responses:
 *       201:
 *         description: Delivery partner request submitted
 */
router.post("/delivery-signup", handleDocUpload, applicationRules, validate, auth.deliverySignup);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify email OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post("/verify-otp", auth.verifyOTP);

router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
const asyncHandler = require("../utils/asyncHandler");

router.post("/login", loginRules, validate, asyncHandler(auth.login));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("id name email mobile_no address city role");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               mobile_no: { type: string }
 *               city: { type: string }
 *               address: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/me", authMiddleware, [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("mobile_no").optional().trim().matches(/^[5-9]\d{9}$/).withMessage("Invalid mobile number"),
  body("city").optional().trim(),
  body("address").optional().trim(),
], validate, async (req, res) => {
  const { name, mobile_no, city, address } = req.body;
  
  try {
    const updates = {};
    if (name) updates.name = name;
    if (mobile_no) updates.mobile_no = mobile_no;
    if (city) updates.city = city;
    if (address) updates.address = address;

    await User.findByIdAndUpdate(req.user.id, updates);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error updating profile" });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", authMiddleware, auth.logout);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token returned
 */
router.post("/refresh-token", auth.refreshToken);

module.exports = router;