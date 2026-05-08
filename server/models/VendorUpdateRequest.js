const mongoose = require("mongoose");

const vendorUpdateRequestSchema = new mongoose.Schema(
  {
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
    request_type: { type: String, enum: ["add", "edit", "delete"], required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

// ── TASK 1: Indexing Audit ──────────────────────────────────────────────────
// Admin approval queue
vendorUpdateRequestSchema.index({ status: 1, createdAt: -1 }, { background: true });
// Vendor's own request history
vendorUpdateRequestSchema.index({ vendor_id: 1 }, { background: true });

module.exports = mongoose.model("VendorUpdateRequest", vendorUpdateRequestSchema);

