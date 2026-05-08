const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    legacy_id: { type: Number, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "vendor", "admin", "delivery_boy"], default: "user" },
    mobile_no: { type: String },
    city: { type: String },
    address: { type: String },
    is_verified: { type: Boolean, default: false },
    vendor_status: { type: String, enum: ["pending", "approved", "rejected", null], default: null },
    shop_name: { type: String },
    rejection_reason: { type: String },
    document_url: { type: String },
    id_proof_url: { type: String },
    delivery_status: { type: String, enum: ["pending", "approved", "rejected", null], default: null },
    vehicle_details: { type: String },
    vehicle_number: { type: String },
    refresh_token: { type: String },

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ID mapping to maintain frontend compatibility
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// ── TASK 1: Indexing Audit ──────────────────────────────────────────────────
// Role-based filtering (admin/vendor listings)
userSchema.index({ role: 1, vendor_status: 1 }, { background: true });
// City-based filtering (dashboard default)
userSchema.index({ city: 1 }, { background: true });

module.exports = mongoose.model("User", userSchema);

