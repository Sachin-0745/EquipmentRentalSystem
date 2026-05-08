const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const { auth: authMiddleware, isVendor } = require("../middlewares/auth");
const { validate, productCreateRules, productUpdateRules } = require("../middlewares/validate");
const upload = require("../middlewares/upload");

/**
 * @swagger
 * tags:
 *   name: Vendor
 *   description: Vendor-specific operations for managing equipment and orders
 */

router.use(authMiddleware);
router.use(isVendor);

/**
 * @swagger
 * /vendor/me:
 *   get:
 *     summary: Get vendor's own status
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor status data
 */
router.get("/me", vendorController.getVendorMe);

/**
 * @swagger
 * /vendor/equipment:
 *   get:
 *     summary: Get all equipment listed by the vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendor's equipment
 */
router.get("/equipment", vendorController.getVendorEquipment);

/**
 * @swagger
 * /vendor/rentals:
 *   get:
 *     summary: Get rentals related to vendor's equipment
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rentals
 */
router.get("/rentals", vendorController.getVendorRentals);

/**
 * @swagger
 * /vendor/orders:
 *   get:
 *     summary: Get orders to be fulfilled by the vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendor orders
 */
router.get("/orders", vendorController.getVendorOrders);

/**
 * @swagger
 * /vendor/earnings:
 *   get:
 *     summary: Get total earnings of the vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings summary
 */
router.get("/earnings", vendorController.getVendorEarnings);

/**
 * @swagger
 * /vendor/equipment:
 *   post:
 *     summary: Add new equipment (Requires Admin approval)
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     responses:
 *       201:
 *         description: Equipment added and pending
 */
router.post("/equipment", upload.single("image"), productCreateRules, validate, vendorController.createEquipment);

/**
 * @swagger
 * /vendor/equipment/{id}:
 *   put:
 *     summary: Update existing equipment
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Equipment updated
 */
router.put("/equipment/:id", upload.single("image"), productUpdateRules, validate, vendorController.updateEquipment);

/**
 * @swagger
 * /vendor/equipment/{id}:
 *   delete:
 *     summary: Delete vendor's equipment
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Equipment deleted
 */
router.delete("/equipment/:id", vendorController.deleteEquipment);

/**
 * @swagger
 * /vendor/update-requests:
 *   post:
 *     summary: Create an update request for existing equipment
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Update request created
 */
router.post("/update-requests", vendorController.createUpdateRequest);

/**
 * @swagger
 * /vendor/update-requests:
 *   get:
 *     summary: Get vendor's update request history
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of update requests
 */
router.get("/update-requests", vendorController.getUpdateRequests);

router.get("/rental-requests", vendorController.getRentalRequests);
router.get("/delivery-boys", vendorController.getDeliveryBoys);
router.put("/orders/:id/status", vendorController.updateVendorOrderStatus);
router.put("/orders/:id/assign-delivery", vendorController.assignVendorOrderDeliveryBoy);
router.get("/returns", vendorController.getVendorReturns);

module.exports = router;
