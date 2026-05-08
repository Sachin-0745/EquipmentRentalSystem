const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    start_date: { type: Date, required: false },
    end_date: { type: Date, required: false },
    quantity: { type: Number, required: true, default: 1 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cartSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// ── TASK 1: Indexing Audit ──────────────────────────────────────────────────
// Most common lookup: current user's cart
cartSchema.index({ user_id: 1 }, { background: true });

module.exports = mongoose.model("Cart", cartSchema);

