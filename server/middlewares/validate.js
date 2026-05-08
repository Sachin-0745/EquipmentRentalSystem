/**
 * middlewares/validate.js
 * express-validator chains for ALL routes.
 * Import the relevant rule set in each route file.
 */
const { body, param, query, validationResult } = require("express-validator");

const logger = require("../utils/logger");

// ── Helper: run validation and short-circuit on first error ──────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map((e) => ({ field: e.path, msg: e.msg }));
    logger.warn(`Validation failed for ${req.method} ${req.originalUrl}: ${JSON.stringify(errorList)}`);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorList,
    });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH RULES (already in auth.js — kept here for reference)
// ─────────────────────────────────────────────────────────────────────────────
const signupRules = [
  body("name").trim().notEmpty().withMessage("Name is required")
    .isLength({ max: 100 }).withMessage("Name max 100 chars")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Name must only contain letters"),
  body("email").trim().isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password").isLength({ min: 8, max: 12 }).withMessage("Password must be 8–12 characters"),
  body("mobile_no").trim().matches(/^[5-9]\d{9}$/).withMessage("Mobile must be 10 digits starting with 5–9"),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Invalid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT / EQUIPMENT RULES
// ─────────────────────────────────────────────────────────────────────────────
const productCreateRules = [
  body("name").trim().notEmpty().withMessage("Equipment name is required")
    .isLength({ max: 150 }).withMessage("Name max 150 chars"),
  body("price").toFloat().isFloat({ gt: 0 }).withMessage("Price must be a positive number"),
  body("quantity").toInt().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("category").trim().notEmpty().withMessage("Category is required")
    .isLength({ max: 100 }).withMessage("Category max 100 chars"),
  body("description").optional().isLength({ max: 1000 }).withMessage("Description max 1000 chars"),
  body("city").trim().notEmpty().withMessage("City is required")
    .isIn(["Jaipur", "Ajmer"]).withMessage("City must be Jaipur or Ajmer"),
];

const productUpdateRules = [
  param("id").isMongoId().withMessage("Invalid product ID"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty")
    .isLength({ max: 150 }).withMessage("Name max 150 chars"),
  body("price").optional().toFloat().isFloat({ gt: 0 }).withMessage("Price must be positive"),
  body("quantity").optional().toInt().isInt({ min: 0 }).withMessage("Quantity must be >= 0"),
  body("description").optional().isLength({ max: 1000 }).withMessage("Description max 1000 chars"),
  body("city").optional().isIn(["Jaipur", "Ajmer"]).withMessage("City must be Jaipur or Ajmer"),
];

// ─────────────────────────────────────────────────────────────────────────────
// CART RULES
// ─────────────────────────────────────────────────────────────────────────────
const cartAddRules = [
  body("equipment_id").isMongoId().withMessage("Invalid equipment ID"),
  body("quantity").toInt().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("start_date").optional().isISO8601().withMessage("Invalid start date (use YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!value) return true;
      if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),
  body("end_date").optional().isISO8601().withMessage("Invalid end date (use YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!value) return true;
      if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
];

// ─────────────────────────────────────────────────────────────────────────────
// RENTAL / CHECKOUT RULES
// ─────────────────────────────────────────────────────────────────────────────
const checkoutRules = [
  body("delivery_address").trim().notEmpty().withMessage("Delivery address is required")
    .isLength({ max: 500 }).withMessage("Address max 500 chars"),
  body("delivery_city").trim().isIn(["Jaipur", "Ajmer"]).withMessage("Invalid delivery city"),
  body("deliveryType").isIn(["delivery", "pickup"]).withMessage("Invalid delivery type"),
  body("paymentMethod").optional().isIn(["COD", "ONLINE"]).withMessage("Payment method must be COD or ONLINE"),
];

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW RULES
// ─────────────────────────────────────────────────────────────────────────────
const reviewRules = [
  body("equipment_id").isMongoId().withMessage("Invalid equipment ID"),
  body("rating").toInt().isInt({ min: 1, max: 5 }).withMessage("Rating must be 1–5"),
  body("comment").optional().isLength({ max: 250 }).withMessage("Comment max 250 chars"),
];

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE UPDATE RULES
// ─────────────────────────────────────────────────────────────────────────────
const profileUpdateRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty")
    .isLength({ max: 100 }).withMessage("Name max 100 chars")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Name must only contain letters"),
  body("mobile_no").optional().trim().matches(/^[5-9]\d{9}$/).withMessage("Invalid mobile number"),
  body("address").optional().trim().isLength({ max: 500 }).withMessage("Address max 500 chars"),
  body("city").optional().isIn(["Jaipur", "Ajmer"]).withMessage("City must be Jaipur or Ajmer"),
];

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR UPDATE REQUEST RULES
// ─────────────────────────────────────────────────────────────────────────────
const vendorRequestRules = [
  body("product_id").isMongoId().withMessage("Invalid product ID"),
  body("request_type").isIn(["update", "delete"]).withMessage("Request type must be update or delete"),
  body("updated_data.price").optional().toFloat().isFloat({ gt: 0 }).withMessage("Price must be positive"),
  body("updated_data.quantity").optional().toInt().isInt({ min: 0 }).withMessage("Quantity must be >= 0"),
  body("updated_data.description").optional().isLength({ max: 1000 }).withMessage("Description max 1000 chars"),
];

// ─────────────────────────────────────────────────────────────────────────────
// PARAM RULES
// ─────────────────────────────────────────────────────────────────────────────
const equipmentSearchRules = [
  query("q").optional().trim().isLength({ max: 100 }).withMessage("Search query too long"),
  query("min_price").optional().toFloat().isFloat({ min: 0 }).withMessage("Min price must be >= 0"),
  query("max_price").optional().toFloat().isFloat({ min: 0 }).withMessage("Max price must be >= 0"),
  query("city").optional().trim().isIn(["Jaipur", "Ajmer"]).withMessage("City must be Jaipur or Ajmer"),
  query("category").optional().trim(),
];

const cartUpdateRules = [
  param("id").isMongoId().withMessage("Invalid cart item ID"),
  body("quantity").optional().toInt().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("start_date").optional().isISO8601().withMessage("Invalid start date (use YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!value) return true;
      if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),
  body("end_date").optional().isISO8601().withMessage("Invalid end date (use YYYY-MM-DD)")
    .custom((value, { req }) => {
      if (!value) return true;
      if (req.body.start_date && new Date(value) <= new Date(req.body.start_date)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
];

const idParamRules = [
  param("id").isMongoId().withMessage("ID parameter must be a valid Mongo ID"),
];

const availabilityCheckRules = [
  query("start_date").isISO8601().withMessage("Invalid start date"),
  query("end_date").isISO8601().withMessage("Invalid end date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.start_date)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
];

const applicationRules = [
  body("name").trim().notEmpty().withMessage("Name is required")
    .isLength({ max: 100 }).withMessage("Name max 100 chars")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Name must only contain letters"),
  body("email").trim().isEmail().withMessage("Invalid email").normalizeEmail(),
  body("mobile_no").trim().matches(/^[5-9]\d{9}$/).withMessage("Mobile must be 10 digits starting with 5–9"),
  body("password").optional({ checkFalsy: true }).isLength({ min: 8, max: 12 }).withMessage("Password must be 8–12 characters"),
];

module.exports = {
  validate,
  signupRules,
  applicationRules,
  loginRules,
  productCreateRules,
  productUpdateRules,
  cartAddRules,
  cartUpdateRules,
  checkoutRules,
  reviewRules,
  profileUpdateRules,
  vendorRequestRules,
  idParamRules,
  equipmentSearchRules,
  availabilityCheckRules,
};
