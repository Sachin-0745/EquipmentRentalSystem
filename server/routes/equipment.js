const express = require("express");
const router  = express.Router();
const equipmentController = require("../controllers/equipmentController");
const { cache } = require("../middlewares/cache");
const { auth, isVendor, isAdmin } = require("../middlewares/auth");
const { 
  validate, 
  equipmentSearchRules, 
  availabilityCheckRules, 
  idParamRules 
} = require("../middlewares/validate");

/**
 * @swagger
 * tags:
 *   name: Equipment
 *   description: Equipment browsing and management
 */

/**
 * @swagger
 * /equipment:
 *   get:
 *     summary: List approved equipment (paginated, filterable)
 *     tags: [Equipment]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: Filter by city
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Name keyword search
 *     responses:
 *       200:
 *         description: Paginated list of approved equipment with avg_rating
 */
router.get("/", equipmentSearchRules, validate, cache(90), equipmentController.getEquipment);

/**
 * @swagger
 * /equipment/search:
 *   get:
 *     summary: Advanced search — full text, price range, date availability
 *     tags: [Equipment]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text search on name + description
 *       - in: query
 *         name: min_price
 *         schema: { type: number }
 *         description: Minimum price per day
 *       - in: query
 *         name: max_price
 *         schema: { type: number }
 *         description: Maximum price per day
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date }
 *         description: Availability start date (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date }
 *         description: Availability end date (ISO 8601)
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Filtered, paginated equipment list
 *       400:
 *         description: Invalid date range
 */
router.get("/search", equipmentSearchRules, validate, equipmentController.searchEquipment);

/**
 * @swagger
 * /equipment/bulk-upload:
 *   post:
 *     summary: Bulk import equipment via JSON array (vendor/admin only)
 *     tags: [Equipment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 maxItems: 200
 *                 items:
 *                   type: object
 *                   required: [name, price, category, city, quantity]
 *                   properties:
 *                     name:        { type: string }
 *                     description: { type: string }
 *                     price:       { type: number }
 *                     category:    { type: string }
 *                     city:        { type: string }
 *                     quantity:    { type: integer }
 *                     image:       { type: string }
 *     responses:
 *       200:
 *         description: Bulk insert result with skipped row details
 *       400:
 *         description: Validation error
 */
router.post("/bulk-upload", auth, isVendor, equipmentController.bulkUpload);

/**
 * @swagger
 * /equipment/{id}:
 *   get:
 *     summary: Get single equipment details with avg_rating
 *     tags: [Equipment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Equipment object with avg_rating and review_count
 *       404:
 *         description: Not found
 */
router.get("/:id", idParamRules, validate, equipmentController.getEquipmentById);

/**
 * @swagger
 * /equipment/{id}/availability:
 *   get:
 *     summary: Check available stock for a date range
 *     tags: [Equipment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: "{ available: number, total: number }"
 *       400:
 *         description: Missing dates
 */
router.get("/:id/availability", idParamRules, availabilityCheckRules, validate, equipmentController.getEquipmentAvailability);

/**
 * @swagger
 * /equipment/{id}/booked-dates:
 *   get:
 *     summary: Get fully-booked date ranges for calendar display (next 90 days)
 *     tags: [Equipment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of {start, end} date pairs that are fully booked
 */
router.get("/:id/booked-dates", idParamRules, validate, cache(60), equipmentController.getBookedDates);

module.exports = router;
