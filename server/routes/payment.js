const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { auth: authMiddleware } = require("../middlewares/auth");

router.post("/verify", authMiddleware, paymentController.verifyPayment);

module.exports = router;
