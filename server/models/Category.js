const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

// Virtual for ID mapping to match frontend
categorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Category", categorySchema);
