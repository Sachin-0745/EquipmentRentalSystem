const Rental = require("../models/Rental");
const Notification = require("../models/Notification");

exports.getAssignedOrders = async (req, res, next) => {
  try {
    const orders = await Rental.find({ 
      delivery_boy_id: req.user.id,
      status: "approved" // Only show initial delivery phase orders
    })
      .populate("equipment_id", "name image")
      .populate("user_id", "name mobile_no")
      .sort({ createdAt: -1 });

    const formatted = orders.map(r => ({
      id: r._id,
      status: r.status,
      delivery_status: r.delivery_status,
      delivery_address: r.delivery_address,
      delivery_city: r.delivery_city,
      lat: r.delivery_lat,
      lng: r.delivery_lng,
      start_date: r.start_date,
      end_date: r.end_date,
      due_status: new Date(r.start_date).toDateString() === new Date().toDateString() ? 'today' : (new Date(r.start_date) > new Date() ? 'upcoming' : 'overdue'),
      quantity: r.quantity,
      payment_method: r.payment_method,
      total_price: r.total_price,
      equipment_name: r.equipment_id ? r.equipment_id.name : "Unknown",
      image: r.equipment_id ? r.equipment_id.image : "",
      user_name: r.user_id ? r.user_id.name : "Unknown",
      user_phone: r.user_id ? r.user_id.mobile_no : "Unknown"
    }));
    
    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { action, status } = req.body;
    
    if (action === "reject" || action === "skip") {
      const rental = await Rental.findOne({ _id: req.params.id, delivery_boy_id: req.user.id });
      if (!rental) return res.status(404).json({ error: "Order not found" });

      rental.delivery_boy_id = null;
      rental.delivery_status = "pending";
      if (!rental.skipped_by.includes(req.user.id)) {
        rental.skipped_by.push(req.user.id);
      }

      // Check if any delivery boys are left in the city
      const User = require("../models/User");
      const driversLeft = await User.countDocuments({ 
        role: "delivery_boy", 
        city: rental.delivery_city,
        _id: { $nin: rental.skipped_by }
      });

      if (driversLeft === 0) {
        rental.delivery_status = "failed"; // All drivers skipped
      }

      await rental.save();
      return res.json({ success: true, message: "Order skipped successfully." });
    }

    const targetStatus = status || req.body.status;
    const validStatuses = ["pending", "assigned", "picked_up", "out_for_delivery", "delivered"];
    if (!validStatuses.includes(targetStatus)) return res.status(400).json({ error: "Invalid status" });

    const order = await Rental.findOneAndUpdate(
      { _id: req.params.id, delivery_boy_id: req.user.id },
      { delivery_status: targetStatus },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (targetStatus === "delivered") {
      order.status = "active";
      order.initial_delivery_boy_id = req.user.id; // Store who did the initial delivery
      if (order.payment_method === "COD") {
        order.payment_status = "paid"; // Payment collected by delivery boy
      }
      await order.save();
    }

    res.json({ success: true, message: `Order marked as ${targetStatus}` });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    // 1. Get initial deliveries done by this boy
    const initialDeliveries = await Rental.find({ 
      initial_delivery_boy_id: req.user.id,
      delivery_status: { $in: ["delivered", "returned", "ready_for_pickup"] } 
    }).populate("equipment_id", "name image").populate("user_id", "name mobile_no");

    // 2. Get return pickups done by this boy
    const returnPickups = await Rental.find({ 
      delivery_boy_id: req.user.id,
      delivery_status: "returned"
    }).populate("equipment_id", "name image").populate("user_id", "name mobile_no");

    const history = [];

    initialDeliveries.forEach(r => {
      history.push({
        id: r._id,
        equipment_name: r.equipment_id ? r.equipment_id.name : "Unknown",
        image: r.equipment_id ? r.equipment_id.image : "",
        user_name: r.user_id ? r.user_id.name : "Unknown",
        delivery_address: r.delivery_address,
        type: 'Initial Delivery'
      });
    });

    returnPickups.forEach(r => {
      // Even if it's the same rental ID, we add it as a separate task entry
      history.push({
        id: r._id,
        equipment_name: r.equipment_id ? r.equipment_id.name : "Unknown",
        image: r.equipment_id ? r.equipment_id.image : "",
        user_name: r.user_id ? r.user_id.name : "Unknown",
        delivery_address: r.delivery_address,
        type: 'Return Pickup'
      });
    });

    res.json({ success: true, data: history.sort((a,b) => b.id.toString().localeCompare(a.id.toString())) });
  } catch (err) { next(err); }
};

exports.getReturns = async (req, res, next) => {
  try {
    const returns = await Rental.find({ 
      delivery_boy_id: req.user.id,
      status: { $in: ["return_requested", "returned"] },
      delivery_status: { $ne: "delivered" } // If already delivered initial, but now in return phase
    })
    .populate("equipment_id", "name image")
    .populate("user_id", "name mobile_no")
    .sort({ updatedAt: -1 });

    const formatted = returns.map(r => ({
      id: r._id,
      equipment_name: r.equipment_id ? r.equipment_id.name : "Unknown",
      image: r.equipment_id ? r.equipment_id.image : "",
      user_name: r.user_id ? r.user_id.name : "Unknown",
      mobile_no: r.user_id ? r.user_id.mobile_no : "N/A",
      quantity: r.quantity,
      status: r.status,
      delivery_address: r.delivery_address,
      delivery_city: r.delivery_city,
      lat: r.delivery_lat,
      lng: r.delivery_lng
    }));

    res.json({ success: true, data: formatted });
  } catch (err) { next(err); }
};

exports.updateReturnAction = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (action === 'reject' || action === 'skip') {
      const rental = await Rental.findById(req.params.id);
      if (!rental) return res.status(404).json({ error: "Rental not found" });

      rental.delivery_boy_id = null;
      if (!rental.skipped_by.includes(req.user.id)) {
        rental.skipped_by.push(req.user.id);
      }

      const User = require("../models/User");
      const driversLeft = await User.countDocuments({ 
        role: "delivery_boy", 
        city: rental.delivery_city,
        _id: { $nin: rental.skipped_by }
      });

      if (driversLeft === 0) {
        rental.delivery_status = "failed";
      }

      await rental.save();
      return res.json({ success: true, message: "Return pickup rejected" });
    }
    // Accept or other actions
    res.json({ success: true, message: `Return pickup ${action}ed` });
  } catch (err) { next(err); }
};

exports.markReturnPicked = async (req, res, next) => {
  try {
    const order = await Rental.findOneAndUpdate(
      { _id: req.params.id, delivery_boy_id: req.user.id },
      { 
        status: "returned", // Item is now with the driver
        delivery_status: "returned" 
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, message: "Marked as picked up from customer" });
  } catch (err) { next(err); }
};

exports.getEarnings = async (req, res, next) => {
  try {
    // 1. Count initial deliveries performed by this driver
    const deliveryCount = await Rental.countDocuments({ 
      initial_delivery_boy_id: req.user.id,
      delivery_status: { $in: ["delivered", "returned", "ready_for_pickup"] } 
    });

    // 2. Count return pickups performed by this driver
    const returnCount = await Rental.countDocuments({ 
      delivery_boy_id: req.user.id,
      delivery_status: "returned"
    });

    // Each task pays ₹30
    const totalEarnings = (deliveryCount + returnCount) * 30;

    res.json({ success: true, earnings: totalEarnings });
  } catch (err) { next(err); }
};
