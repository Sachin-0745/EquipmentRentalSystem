const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const { auth: authMiddleware } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Delivery partner operations for order fulfillment
 */

router.use(authMiddleware);

/**
 * @swagger
 * /delivery/orders:
 *   get:
 *     summary: Get orders assigned to the delivery partner
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned orders
 */
router.get("/orders", deliveryController.getAssignedOrders);

/**
 * @swagger
 * /delivery/orders/{id}/action:
 *   put:
 *     summary: Update status of a delivery order (e.g., Picked Up, Delivered)
 *     tags: [Delivery]
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [pickup, deliver, start_return_pickup, complete_return_delivery] }
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.put("/orders/:id/action", deliveryController.updateOrderStatus);

router.get("/history", deliveryController.getHistory);
router.get("/returns", deliveryController.getReturns);
router.put("/returns/:id/action", deliveryController.updateReturnAction);
router.put("/returns/:id/picked", deliveryController.markReturnPicked);
router.get("/earnings", deliveryController.getEarnings);

module.exports = router;
