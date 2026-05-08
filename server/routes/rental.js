const express = require("express");
const router = express.Router();
const rentalController = require("../controllers/rentalController");
const { auth: authMiddleware } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Rental order placement and tracking
 */

/**
 * @swagger
 * /check-availability:
 *   post:
 *     summary: Verify availability for items in the cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability confirmed
 */
router.post("/check-availability", authMiddleware, rentalController.checkAvailability);

/**
 * @swagger
 * /rent:
 *   post:
 *     summary: Checkout and create a rental order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [delivery_type, delivery_address]
 *             properties:
 *               delivery_type: { type: string, enum: [Home Delivery, Self Pickup] }
 *               delivery_address: { type: string }
 *               coupon_code: { type: string }
 *     responses:
 *       201:
 *         description: Rental order created
 */
router.post("/rent", authMiddleware, rentalController.rentCheckout);

/**
 * @swagger
 * /rentals:
 *   get:
 *     summary: Get user's rental history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rentals
 */
router.get("/rentals", authMiddleware, rentalController.getRentals);

/**
 * @swagger
 * /rentals/track:
 *   get:
 *     summary: Track active rentals and delivery status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active rental tracking data
 */
router.get("/rentals/track", authMiddleware, rentalController.trackRentals);

/**
 * @swagger
 * /rentals/cancel/{id}:
 *   post:
 *     summary: Cancel a pending rental
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rental cancelled
 */
router.post("/rentals/cancel/:id", authMiddleware, rentalController.cancelRental);

/**
 * @swagger
 * /rentals/return/{id}:
 *   post:
 *     summary: Initiate a return request for a rental
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [return_type]
 *             properties:
 *               return_type: { type: string, enum: [Self Return, Return Pickup] }
 *     responses:
 *       200:
 *         description: Return request initiated
 */
router.post("/rentals/return/:id", authMiddleware, rentalController.returnRental);

/**
 * @swagger
 * /rentals/switch-pickup/{id}:
 *   put:
 *     summary: Switch delivery to self-pickup
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Delivery switched to self-pickup
 */
router.put("/rentals/switch-pickup/:id", authMiddleware, rentalController.switchToPickup);

module.exports = router;
