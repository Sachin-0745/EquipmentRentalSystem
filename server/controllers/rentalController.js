const Rental = require("../models/Rental");
const Equipment = require("../models/Equipment");
const Cart = require("../models/Cart");
const logger = require("../utils/logger");
const Notification = require("../models/Notification");
const { withRetry } = require("../utils/reliability");


exports.checkAvailability = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: "Missing data" });

    const conflicts = [];

    for (let item of items) {
      const eq = await Equipment.findById(item.equipment_id);
      if (!eq) {
        conflicts.push({ name: "Unknown", error: "Not found" });
        continue;
      }
      
      const overlappingRentals = await Rental.aggregate([
        {
          $match: {
            equipment_id: eq._id,
            status: "active",
            $and: [
              { start_date: { $lte: new Date(item.end_date) } },
              { end_date: { $gte: new Date(item.start_date) } }
            ]
          }
        },
        {
          $group: { _id: null, totalRented: { $sum: "$quantity" } }
        }
      ]);

      const rented = overlappingRentals.length ? overlappingRentals[0].totalRented : 0;
      if (rented + item.quantity > eq.quantity) {
        conflicts.push({
          name: eq.name,
          error: `Only ${eq.quantity - rented} available for the selected dates.`
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({ error: "Some items are not available", conflicts });
    }

    res.json({ message: "All items available" });
  } catch (error) {
    next(error);
  }
};

exports.rentCheckout = async (req, res, next) => {
  try {
    const { items, delivery_type, deliveryType, delivery_address, delivery_city, delivery_lat, delivery_lng, total_amount } = req.body;
    const actualDeliveryType = deliveryType || delivery_type || "pickup";
    const paymentMethod = req.body.paymentMethod || "COD";
    const user_id = req.user.id;

    if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });

    // Validate availability again
    for (let item of items) {
      const eq = await Equipment.findById(item.equipment_id);
      if (!eq || eq.quantity < item.quantity) {
        return res.status(400).json({ error: `Not enough stock for ${item.name}` });
      }
    }

    const rentals = [];
    for (let item of items) {
      const eq = await Equipment.findById(item.equipment_id);
      if (!eq) continue;

      const parsedStart = new Date(item.start_date);
      const parsedEnd = new Date(item.end_date);
      const days = Math.max(1, Math.ceil((parsedEnd - parsedStart) / (1000 * 60 * 60 * 24)));
      const totalPrice = eq.price * item.quantity * days;

      rentals.push({
        user_id,
        equipment_id: item.equipment_id,
        start_date: parsedStart,
        end_date: parsedEnd,
        quantity: item.quantity,
        total_price: totalPrice,
        status: "pending",
        delivery_type: actualDeliveryType,
        delivery_address: delivery_address || "",
        delivery_city: delivery_city || "",
        delivery_lat: delivery_lat || null,
        delivery_lng: delivery_lng || null,
        payment_method: paymentMethod,
        payment_status: "pending"
      });
    }

    // Add ₹50 delivery charge to the first item's total_price if delivery is selected
    if (actualDeliveryType === 'delivery' && rentals.length > 0) {
      rentals[0].total_price += 50;
    }

    const inserted = await withRetry(() => Rental.insertMany(rentals));

    // Clear cart for these items
    const equipmentIds = items.map(i => i.equipment_id);
    await Cart.deleteMany({ user_id, equipment_id: { $in: equipmentIds } });

    logger.info(`Rental Order Placed: User ${user_id} placed an order for ${items.length} item(s)`);

    // Handle Payment Logic
    
    if (paymentMethod === "ONLINE") {
      const totalAmount = rentals.reduce((acc, r) => acc + r.total_price, 0);
      const deliveryCharge = (req.body.deliveryType === 'delivery') ? 50 : 0;
      const finalAmount = (totalAmount + deliveryCharge) * 100; // In paise

      const razorpayInstance = require("../utils/razorpay");
      const order = await razorpayInstance.orders.create({
        amount: finalAmount,
        currency: "INR",
        receipt: `receipt_${inserted[0]._id}`,
      });

      // Update rentals with the order ID for tracking
      await Rental.updateMany(
        { _id: { $in: inserted.map(r => r._id) } },
        { $set: { razorpay_order_id: order.id } }
      );

      return res.json({ 
        message: "Rental placed. Please complete payment.", 
        razorpayOrderId: order.id,
        amount: finalAmount,
        key: process.env.RAZORPAY_KEY_ID,
        orderIds: inserted.map(r => r._id)
      });
    }

    res.json({ message: "Rental placed successfully", orderIds: inserted.map(r => r._id) });
  } catch (error) {
    next(error);
  }
};

exports.getRentals = async (req, res, next) => {
  try {
    const rentals = await Rental.find({ user_id: req.user.id })
      .populate("equipment_id")
      .sort({ createdAt: -1 });
    
    // Format for frontend
    const formatted = rentals.map(r => ({
      id: r._id,
      equipment_id: r.equipment_id ? r.equipment_id._id : null,
      name: r.equipment_id ? r.equipment_id.name : "Unknown",
      image: r.equipment_id ? r.equipment_id.image : "",
      start_date: r.start_date,
      end_date: r.end_date,
      total_price: r.total_price,
      quantity: r.quantity,
      status: r.status,
      delivery_type: r.delivery_type,
      delivery_address: r.delivery_address,
      delivery_status: r.delivery_status
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

exports.trackRentals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const total = await Rental.countDocuments({ user_id: req.user.id });
    const rentals = await Rental.find({ user_id: req.user.id })
      .populate("equipment_id")
      .populate("delivery_boy_id", "name mobile_no")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = rentals.map(r => ({
      id: r._id,
      name: r.equipment_id ? r.equipment_id.name : "Unknown",
      image: r.equipment_id ? r.equipment_id.image : "",
      start_date: r.start_date,
      end_date: r.end_date,
      total_price: r.total_price,
      quantity: r.quantity,
      status: r.status,
      delivery_type: r.delivery_type,
      delivery_status: r.delivery_status,
      delivery_boy: r.delivery_boy_id ? r.delivery_boy_id.name : null,
      delivery_boy_phone: r.delivery_boy_id ? r.delivery_boy_id.mobile_no : null,
      payment_status: r.payment_status || "pending",
      payment_method: r.payment_method || "COD",
      equipment_id: r.equipment_id ? r.equipment_id._id : null
    }));

    res.json({
      success: true,
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelRental = async (req, res, next) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!rental) return res.status(404).json({ error: "Rental not found" });

    logger.info(`[CancelRental] Attempting to cancel order ${req.params.id}. Current status: "${rental.status}"`);

    const cancellableStatuses = ['pending', 'approved', 'active'];
    if (!cancellableStatuses.includes(rental.status.toLowerCase().trim())) {
      return res.status(400).json({ error: `Cannot cancel this order. Current status: ${rental.status}` });
    }

    rental.status = "cancelled";
    await rental.save();

    res.json({ message: "Rental cancelled" });
  } catch (error) {
    next(error);
  }
};

exports.returnRental = async (req, res, next) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!rental) return res.status(404).json({ error: "Rental not found" });

    if (rental.status !== 'active') {
      return res.status(400).json({ error: "Rental is not active" });
    }

    const { return_method } = req.body;
    rental.status = "return_requested";
    rental.return_method = return_method || "self_return";
    // Clear delivery boy to allow manual assignment for the return phase
    rental.delivery_boy_id = null;
    rental.delivery_status = "pending";
    rental.skipped_by = []; // Reset skips for the new phase

    await rental.save();

    await Notification.create({
      type: 'admin_alert',
      message: `Return requested for order ${rental._id}`
    });

    res.json({ message: "Return requested successfully" });
  } catch (error) {
    next(error);
  }
};

exports.switchToPickup = async (req, res, next) => {
  try {
    const rental = await Rental.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!rental) return res.status(404).json({ error: "Rental not found" });

    rental.delivery_type = "pickup";
    rental.delivery_status = "pending";
    // If it was a return phase
    if (rental.status === 'return_requested') {
      rental.return_method = "self_return";
    }

    await rental.save();
    res.json({ success: true, message: "Changed to self-pickup successfully" });
  } catch (error) { next(error); }
};
