const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { auth: authMiddleware } = require("../middlewares/auth");

router.get("/equipment/:id/reviews", reviewController.getReviews);
router.post("/reviews", authMiddleware, reviewController.addReview);

module.exports = router;
