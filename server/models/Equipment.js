const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

const equipmentSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, index: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    description: { type: String },
    image: { type: String },
    city: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    vendor_price: { type: Number },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ID mapping to maintain frontend compatibility
equipmentSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// ── TASK 1: Indexes for search & filter performance ──────────────────────────
// Compound index for the most common query pattern: city + status + category
equipmentSchema.index({ city: 1, status: 1, category: 1 });
// Price range queries
equipmentSchema.index({ price: 1 });
// Vendor-specific queries (vendor dashboard)
equipmentSchema.index({ vendor_id: 1, status: 1 });
// Text index for full-text search on name and description
equipmentSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Equipment", equipmentSchema);

