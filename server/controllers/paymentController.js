const crypto = require("crypto");
const Rental = require("../models/Rental");

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, rental_id } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).json({ error: "Razorpay secret not configured" });

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is verified - Update all rentals associated with this Razorpay Order ID
      await Rental.updateMany(
        { razorpay_order_id },
        { 
          $set: { 
            payment_status: "paid"
          } 
        }
      );
      
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    next(err);
  }
};
