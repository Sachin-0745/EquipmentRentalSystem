const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

router.get("/", async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, message: "Success", data: categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
