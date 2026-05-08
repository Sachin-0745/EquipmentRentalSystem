const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, otp) => {
  // Always log OTP in development for easier testing
  console.log(`[DEV] OTP for ${email}: ${otp}`);
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`
    });
  } catch (error) {
    console.error(`Failed to send OTP email to ${email}:`, error.message);
    // We don't throw the error here to prevent the signup from failing 
    // if only the email notification fails.
  }
};

module.exports = sendOTP;