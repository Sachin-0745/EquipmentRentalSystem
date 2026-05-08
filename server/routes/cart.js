const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { auth: authMiddleware } = require("../middlewares/auth");
const { validate, cartAddRules, cartUpdateRules } = require("../middlewares/validate");

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management for rentals
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's current shopping cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items in the cart
 */
router.get("/", authMiddleware, cartController.getCart);

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add an equipment item to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipment_id, quantity, start_date, end_date]
 *             properties:
 *               equipment_id: { type: string }
 *               quantity: { type: integer, default: 1 }
 *               start_date: { type: string, format: date }
 *               end_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Item added to cart
 *       400:
 *         description: Stock unavailable or validation error
 */
router.post("/", authMiddleware, cartAddRules, validate, cartController.addToCart);

/**
 * @swagger
 * /cart/{id}:
 *   put:
 *     summary: Update quantity of an item in the cart
 *     tags: [Cart]
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
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: Cart item updated
 */
router.put("/:id", authMiddleware, cartUpdateRules, validate, cartController.updateCart);

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed
 */
router.delete("/:id", authMiddleware, cartController.deleteCart);

module.exports = router;
