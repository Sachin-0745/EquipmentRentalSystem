const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth: authMiddleware } = require("../middlewares/auth");
const { validate, profileUpdateRules } = require("../middlewares/validate");

router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, profileUpdateRules, validate, userController.updateProfile);

module.exports = router;
