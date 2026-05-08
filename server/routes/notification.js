const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { auth: authMiddleware } = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.put("/read-all", notificationController.markAllAsRead);

module.exports = router;
