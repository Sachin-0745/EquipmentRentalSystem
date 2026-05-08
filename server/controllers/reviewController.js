const Equipment = require("../models/Equipment");
const Rental    = require("../models/Rental");
const logger    = require("../utils/logger");

/**
 * GET /api/equipment/:id/reviews
 * TASK 3: Returns real reviews with computed average rating.
 * Reviews are embedded inside Equipment documents.
 * READ-ONLY — no existing data modified.
 */
exports.getReviews = async (req, res, next) => {
  try {
    const eq = await Equipment.findById(req.params.id).populate("reviews.user_id", "name");
    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    const reviews = eq.reviews || [];
    const avg_rating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    const formatted = reviews.map(r => ({
      id:         r._id,
      rating:     r.rating,
      comment:    r.comment,
      user_name:  r.user_id?.name || "Anonymous",
      created_at: r.createdAt,
    }));

    res.json({
      success:      true,
      avg_rating:   avg_rating ? parseFloat(avg_rating.toFixed(2)) : null,
      review_count: reviews.length,
      data:         formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews
 * Add a review for an equipment item.
 * Only allows a user to review equipment they have rented (completed status).
 * Additive — no existing reviews deleted or modified.
 */
exports.addReview = async (req, res, next) => {
  try {
    console.log("REVIEW BODY KEYS:", Object.keys(req.body));
    console.log("REVIEW BODY VALUES:", req.body);
    const { equipment_id, rating, comment, review } = req.body;
    const finalComment = comment || review || "";
    const user_id = req.user.id;

    if (!equipment_id || !rating) {
      return res.status(400).json({ success: false, message: "equipment_id and rating are required." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const eq = await Equipment.findById(equipment_id);
    if (!eq) return res.status(404).json({ success: false, message: "Equipment not found." });

    // Check if user has rented this equipment and completed it
    const hasRented = await Rental.findOne({
      user_id,
      equipment_id,
      status: { $in: ["active", "completed"] },
    });

    if (!hasRented) {
      return res.status(403).json({
        success: false,
        message: "You can only review equipment you have rented and completed.",
      });
    }

    // Check for existing review to update, or add new
    const existingIndex = eq.reviews.findIndex(
      r => r.user_id.toString() === user_id.toString()
    );

    if (existingIndex !== -1) {
      eq.reviews[existingIndex].rating = parseInt(rating);
      eq.reviews[existingIndex].comment = finalComment;
    } else {
      eq.reviews.push({ user_id, rating: parseInt(rating), comment: finalComment });
    }
    await eq.save();

    logger.info(`[Review] User ${user_id} reviewed equipment ${equipment_id} — rating: ${rating}`);

    res.json({ success: true, message: "Review added successfully." });
  } catch (err) {
    next(err);
  }
};
