const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const Notification = require("../models/Notification");
const VendorUpdateRequest = require("../models/VendorUpdateRequest");
const { processImage } = require("../utils/imageProcessor");
const { invalidateCache } = require("../middlewares/cache");
const logger = require("../utils/logger");

exports.getVendorMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("vendor_status");
    if (!user) return res.status(404).json({ error: "Vendor not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.getVendorEarnings = async (req, res, next) => {
  try {
    const rentals = await Rental.find({ 
      status: { $in: ["active", "return_requested", "completed"] }
    })
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id },
        select: "_id"
      });
      
    // Filter out rentals that don't belong to this vendor
    const vendorRentals = rentals.filter(r => r.equipment_id != null);
    
    // Sum up the total price
    const totalEarnings = vendorRentals.reduce((sum, r) => sum + (r.total_price || 0), 0);
    
    res.json({ earnings: totalEarnings });
  } catch (err) {
    next(err);
  }
};

exports.getVendorEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.find({ vendor_id: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: equipment });
  } catch (err) {
    next(err);
  }
};

exports.getVendorRentals = async (req, res, next) => {
  try {
    const rentals = await Rental.find()
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id },
        select: "name price"
      })
      .populate("user_id", "name email mobile_no")
      .sort({ createdAt: -1 });

    // Filter out rentals where equipment_id is null (meaning it didn't match vendor_id)
    const vendorRentals = rentals.filter(r => r.equipment_id != null);
    
    res.json({ success: true, data: vendorRentals });
  } catch (err) {
    next(err);
  }
};

exports.getVendorOrders = async (req, res, next) => {
  try {
    const rentals = await Rental.find()
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id },
        select: "name image"
      })
      .populate("user_id", "name mobile_no")
      .populate("delivery_boy_id", "name mobile_no")
      .sort({ createdAt: -1 });

    const vendorOrders = rentals.filter(r => r.equipment_id != null).map(r => ({
      order_id: r._id,
      status: r.status,
      delivery_status: r.delivery_status,
      delivery_address: r.delivery_address,
      start_date: r.start_date,
      end_date: r.end_date,
      total_price: r.total_price,
      quantity: r.quantity,
      delivery_type: r.delivery_type,
      payment_method: r.payment_method || "ONLINE",
      payment_status: r.payment_status || "pending",
      product_name: r.equipment_id.name,
      product_image: r.equipment_id.image,
      user_name: r.user_id ? r.user_id.name : "Unknown",
      user_phone: r.user_id ? r.user_id.mobile_no : "Unknown",
      driver_name: r.delivery_boy_id ? r.delivery_boy_id.name : "Unassigned",
      driver_phone: r.delivery_boy_id ? r.delivery_boy_id.mobile_no : "N/A"
    }));
    
    res.json({ success: true, data: vendorOrders });
  } catch (err) {
    next(err);
  }
};

exports.getVendorEarnings = async (req, res, next) => {
  try {
    const rentals = await Rental.find({ status: "completed" })
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id }
      });

    const vendorRentals = rentals.filter(r => r.equipment_id != null);
    const totalEarnings = vendorRentals.reduce((sum, r) => sum + r.total_price, 0);

    res.json({ success: true, total_earnings: totalEarnings });
  } catch (err) {
    next(err);
  }
};

exports.createEquipment = async (req, res, next) => {
  try {
    const { name, description, category, price, quantity, city } = req.body;

    // TASK 5: Run image through sharp optimizer if it's a local file (not Cloudinary URL)
    let image = null;
    if (req.file) {
      if (req.file.path && req.file.path.startsWith("http")) {
        // Cloudinary already optimized — use URL directly
        image = req.file.path;
      } else {
        // Local disk upload — compress to WebP via processImage
        try {
          const processed = await processImage(req.file);
          image = processed.webp;
        } catch (imgErr) {
          logger.warn("[VendorCreate] Image processing failed, using original:", imgErr.message);
          image = `/uploads/${req.file.filename}`;
        }
      }
    }

    if (!name || !price || !quantity || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eq = await Equipment.create({
      name, description, category, price, quantity, city, image,
      vendor_id: req.user.id,
      status: "pending",
    });

    // TASK 6: Invalidate equipment list cache so new item appears after admin approves
    invalidateCache("/api/equipment");
    logger.info(`[VendorCreate] Equipment created: ${eq._id} by vendor ${req.user.id}`);

    res.json({ message: "Equipment added and pending approval", id: eq._id });
  } catch (err) {
    next(err);
  }
};

exports.updateEquipment = async (req, res, next) => {
  try {
    const { name, description, category, price, quantity, city } = req.body;
    const updates = { name, description, category, price, quantity, city };

    // TASK 5: Compress image on update too
    if (req.file) {
      if (req.file.path && req.file.path.startsWith("http")) {
        updates.image = req.file.path;
      } else {
        try {
          const processed = await processImage(req.file);
          updates.image = processed.webp;
        } catch (imgErr) {
          logger.warn("[VendorUpdate] Image processing failed, using original:", imgErr.message);
          updates.image = `/uploads/${req.file.filename}`;
        }
      }
    }

    const eq = await Equipment.findOneAndUpdate(
      { _id: req.params.id, vendor_id: req.user.id },
      updates,
      { new: true }
    );
    if (!eq) return res.status(404).json({ error: "Equipment not found or unauthorized" });

    // TASK 6: Invalidate cache for this equipment and the list
    invalidateCache("/api/equipment");
    invalidateCache(req.params.id);
    logger.info(`[VendorUpdate] Equipment updated: ${eq._id} by vendor ${req.user.id}`);

    res.json({ message: "Equipment updated", id: eq._id });
  } catch (err) {
    next(err);
  }
};

exports.deleteEquipment = async (req, res, next) => {
  try {
    const eq = await Equipment.findOneAndDelete({ _id: req.params.id, vendor_id: req.user.id });
    if (!eq) return res.status(404).json({ error: "Equipment not found or unauthorized" });

    // TASK 6: Invalidate cache on delete
    invalidateCache("/api/equipment");
    invalidateCache(req.params.id);
    logger.info(`[VendorDelete] Equipment deleted: ${req.params.id} by vendor ${req.user.id}`);

    res.json({ message: "Equipment deleted" });
  } catch (err) {
    next(err);
  }
};

exports.createUpdateRequest = async (req, res, next) => {
  try {
    const { equipment_id, request_type, details } = req.body;
    await VendorUpdateRequest.create({
      vendor_id: req.user.id,
      equipment_id,
      request_type,
      details,
      status: 'pending'
    });
    res.json({ success: true, message: "Update request submitted successfully." });
  } catch (err) {
    next(err);
  }
};

exports.getUpdateRequests = async (req, res, next) => {
  try {
    const requests = await VendorUpdateRequest.find({ vendor_id: req.user.id })
      .populate("equipment_id", "name")
      .sort({ createdAt: -1 });

    const formatted = requests.map(r => ({
      id: r._id,
      product_name: r.equipment_id ? r.equipment_id.name : "Unknown",
      request_type: r.request_type,
      status: r.status,
      created_at: r.createdAt
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};
exports.updateVendorOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const rental = await Rental.findById(req.params.id).populate("equipment_id");

    if (!rental) return res.status(404).json({ error: "Rental not found" });

    // Verify this equipment belongs to the vendor
    if (!rental.equipment_id || rental.equipment_id.vendor_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: This equipment does not belong to you." });
    }

    const allowedStatuses = ["approved", "ready_for_pickup", "picked_up", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    if (status === "approved") {
      rental.status = "approved";
      // Auto-assignment removed to allow manual scheduling by vendor later
    } else if (status === "ready_for_pickup") {
      rental.delivery_status = "ready_for_pickup";
    } else if (status === "picked_up") {
      rental.delivery_status = "delivered";
      rental.status = "active";
      rental.payment_status = "paid"; // Confirming payment upon pickup
    } else if (status === "rejected") {
      rental.status = "rejected";
    }

    await rental.save();

    // Notify the user
    await Notification.create({
      user_id: rental.user_id,
      type: "order_update",
      message: `Your order for ${rental.equipment_id.name} has been marked as ${status.replace(/_/g, ' ')} by the vendor.`
    });

    res.json({ success: true, message: `Order updated to ${status}` });
  } catch (err) {
    next(err);
  }
};

exports.getRentalRequests = async (req, res, next) => {
  try {
    const rentals = await Rental.find({ status: { $in: ["pending", "approved"] } })
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id },
        select: "name image"
      })
      .populate("user_id", "name mobile_no")
      .sort({ start_date: 1, createdAt: -1 });

    const vendorRequests = rentals.filter(r => r.equipment_id != null).map(r => ({
      id: r._id,
      status: r.status,
      delivery_address: r.delivery_address,
      delivery_city: r.delivery_city,
      delivery_type: r.delivery_type,
      delivery_status: r.delivery_status,
      start_date: r.start_date,
      end_date: r.end_date,
      quantity: r.quantity,
      total_price: r.total_price,
      equipment_id: r.equipment_id,
      equipment_name: r.equipment_id.name,
      image: r.equipment_id.image,
      user_id: r.user_id,
      user_name: r.user_id ? r.user_id.name : "Unknown",
      user_phone: r.user_id ? r.user_id.mobile_no : "Unknown",
      payment_method: r.payment_method || "ONLINE",
      payment_status: r.payment_status || "pending"
    }));
    
    res.json(vendorRequests);
  } catch (err) {
    next(err);
  }
};

exports.getVendorReturns = async (req, res, next) => {
  try {
    const returns = await Rental.find({ status: { $in: ["return_requested", "returned"] } })
      .populate({
        path: "equipment_id",
        match: { vendor_id: req.user.id },
        select: "name image"
      })
      .populate("user_id", "name")
      .sort({ start_date: 1, updatedAt: -1 });

    const vendorReturns = returns.filter(r => r.equipment_id != null).map(r => ({
      id: r._id,
      equipment_name: r.equipment_id.name,
      image: r.equipment_id.image,
      user_name: r.user_id ? r.user_id.name : "Unknown",
      quantity: r.quantity,
      status: r.status,
      return_method: r.delivery_type === 'pickup' ? 'self_return' : 'pickup'
    }));

    res.json(vendorReturns);
  } catch (err) { next(err); }
};

exports.assignVendorOrderDeliveryBoy = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id).populate("equipment_id");
    
    if (!rental) return res.status(404).json({ error: "Rental not found" });

    // Verify this equipment belongs to the vendor
    if (!rental.equipment_id || rental.equipment_id.vendor_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: This equipment does not belong to you." });
    }

    // Automatic selection logic
    const User = require("../models/User");
    const deliveryBoy = await User.findOne({ 
      role: "delivery_boy", 
      delivery_status: "approved",
      city: { $regex: new RegExp(`^${rental.delivery_city}$`, "i") },
      _id: { $nin: rental.skipped_by || [] } 
    }) || await User.findOne({ 
      role: "delivery_boy",
      delivery_status: "approved",
      _id: { $nin: rental.skipped_by || [] }
    });

    if (!deliveryBoy) {
      rental.delivery_status = "failed";
      await rental.save();
      return res.status(400).json({ error: "No available delivery boys found." });
    }

    rental.delivery_boy_id = deliveryBoy._id;
    rental.delivery_status = "assigned";
    await rental.save();

    res.json({ success: true, message: `Driver ${deliveryBoy.name} assigned automatically.` });
  } catch (err) { next(err); }
};

exports.getDeliveryBoys = async (req, res, next) => {
  try {
    const drivers = await User.find({ role: "delivery_boy", status: "approved" }).select("name city mobile_no");
    res.json({ success: true, data: drivers });
  } catch (err) { next(err); }
};
