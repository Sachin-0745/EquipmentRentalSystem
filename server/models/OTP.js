const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expires_at: { type: Date, required: true },
  // Store pending user data
  userData: {
    name: String,
    mobile_no: String,
    password: { type: String }, // hashed
    role: { type: String, default: 'user' },
    shop_name: String,
    address: String,
    city: String,
    vehicle_details: String,
    document_url: String,
    id_proof_url: String
  }
});

module.exports = mongoose.model("OTP", otpSchema);
