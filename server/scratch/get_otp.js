const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expires_at: { type: Date, required: true },
});

const OTP = mongoose.model("OTP", otpSchema);

async function getOTP() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const latest = await OTP.findOne({ email: "test_ui@example.com" }).sort({ _id: -1 });
    if (latest) {
      console.log("OTP_FOUND:" + latest.otp);
    } else {
      console.log("OTP_NOT_FOUND");
    }
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getOTP();
