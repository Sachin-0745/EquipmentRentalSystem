const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total_price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected", "active", "completed", "cancelled", "return_requested", "returned"], 
      default: "pending" 
    },
    payment_method: { type: String, enum: ["COD", "ONLINE"], default: "ONLINE" },
    payment_status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    delivery_type: { type: String, enum: ["delivery", "pickup"], default: "pickup" },
    delivery_address: { type: String },
    delivery_city: { type: String },
    delivery_lat: { type: Number },
    delivery_lng: { type: Number },
    delivery_boy_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    initial_delivery_boy_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    delivery_status: { type: String, enum: ["pending", "assigned", "picked_up", "delivered", "ready_for_pickup", "returned", "failed"], default: "pending" },
    skipped_by: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    return_method: { type: String, enum: ["pickup", "self_return"] },
    return_status: { type: String, enum: ["pending", "verified"], default: "pending" }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ID mapping
rentalSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// ── TASK 1 & 2: Indexes for availability checks and rental queries ────────────
// Date-overlap availability check (most critical query)
rentalSchema.index({ equipment_id: 1, status: 1, start_date: 1, end_date: 1 });
// User rental history
rentalSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model("Rental", rentalSchema);

