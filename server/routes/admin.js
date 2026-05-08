const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth: authMiddleware, isAdmin } = require("../middlewares/auth");

router.use(authMiddleware);
router.use(isAdmin);

router.get("/categories", adminController.getCategories);
router.post("/categories", adminController.createCategory);
router.put("/categories/:id", adminController.updateCategory);
router.delete("/categories/:id", adminController.deleteCategory);

router.get("/users", adminController.getUsers);
router.delete("/users/:id", adminController.deleteUser);

router.get("/rentals", adminController.getAllRentals);

router.get("/vendors", adminController.getVendors);
router.put("/vendors/:id/status", adminController.updateVendorStatus);

router.get("/delivery-boys", adminController.getDeliveryBoys);
router.put("/delivery-boys/:id/status", adminController.updateDeliveryBoyStatus);

const upload = require("../middlewares/upload");
const { validate, productCreateRules, productUpdateRules } = require("../middlewares/validate");

router.get("/equipment-approvals", adminController.getEquipmentApprovals);
router.get("/inventory", adminController.getAllEquipment);
router.put("/equipment/:id/status", adminController.updateEquipmentStatus);

router.post("/equipment", upload.single("image"), productCreateRules, validate, adminController.createEquipment);
router.put("/equipment/:id", upload.single("image"), productUpdateRules, validate, adminController.updateAdminEquipment);
router.delete("/equipment/:id", adminController.deleteAdminEquipment);

router.get("/orders", adminController.getAllRentals);
router.get("/rental-requests", adminController.getRentalRequests);
router.put("/orders/:id/status", adminController.updateAdminOrderStatus);

router.get("/returns", adminController.getReturns);
router.get("/update-requests", adminController.getUpdateRequests);
router.put("/update-requests/:id", adminController.processUpdateRequest);

router.get("/cache-stats", adminController.getCacheStats);

router.put("/orders/:id/assign-delivery", adminController.assignDeliveryBoy);

module.exports = router;
