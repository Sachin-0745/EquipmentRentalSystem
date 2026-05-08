const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const Category = require("../models/Category");
const Notification = require("../models/Notification");
const socketUtil = require("../utils/socket");
const { parsePagination, paginatedResponse } = require("../utils/pagination");
const VendorUpdateRequest = require("../models/VendorUpdateRequest");

// --- CATEGORIES ---
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, message: "Success", data: categories });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const cat = await Category.create({ name });
    res.json({ message: "Category created", data: cat });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Category already exists" });
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const cat = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category updated", data: cat });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};

// --- USERS ---
exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const total = await User.countDocuments();
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      mobile_no: u.mobile_no,
      city: u.city,
      is_verified: u.is_verified,
      created_at: u.createdAt
    }));

    paginatedResponse(res, formatted, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

// --- RENTALS ---
exports.getAllRentals = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const total = await Rental.countDocuments();
    const rentals = await Rental.find()
      .populate("user_id", "name email mobile_no")
      .populate("equipment_id", "name vendor_id")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = [];
    for (let r of rentals) {
      let vendor_name = null;
      if (r.equipment_id && r.equipment_id.vendor_id) {
        const vendor = await User.findById(r.equipment_id.vendor_id);
        vendor_name = vendor ? vendor.name : "Unknown Vendor";
      }

      formatted.push({
        id: r._id,
        user_name: r.user_id ? r.user_id.name : "Unknown",
        user_email: r.user_id ? r.user_id.email : "Unknown",
        user_mobile: r.user_id ? r.user_id.mobile_no : "Unknown",
        equipment_name: r.equipment_id ? r.equipment_id.name : "Unknown",
        vendor_name,
        start_date: r.start_date,
        end_date: r.end_date,
        total_price: r.total_price,
        quantity: r.quantity,
        status: r.status,
        created_at: r.createdAt
      });
    }
    paginatedResponse(res, formatted, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// --- VENDORS ---
exports.getVendors = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const query = { $or: [{ role: "vendor" }, { vendor_status: "pending" }] };
    const total = await User.countDocuments(query);
    const vendors = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = vendors.map(v => ({
      id: v._id,
      name: v.name,
      email: v.email,
      mobile_no: v.mobile_no,
      shop_name: v.shop_name,
      city: v.city,
      address: v.address,
      vendor_status: v.vendor_status,
      document_url: v.document_url,
      id_proof_url: v.id_proof_url,
      created_at: v.createdAt
    }));
    paginatedResponse(res, formatted, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.updateVendorStatus = async (req, res, next) => {
  try {
    const { status, message } = req.body;
    const updateData = { vendor_status: status };
    if (status === "approved") {
      updateData.role = "vendor";
    } else if (status === "rejected") {
      updateData.rejection_reason = message;
    }
    
    const vendor = await User.findOneAndUpdate(
      { _id: req.params.id }, 
      updateData, 
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: "User not found" });

    const notificationData = {
      user_id: vendor._id,
      type: "vendor_status",
      message: `Your vendor account has been ${status}${message ? ': ' + message : '.'}`
    };
    await Notification.create(notificationData);
    socketUtil.sendNotification(vendor._id, notificationData);

    res.json({ message: "Vendor status updated successfully" });
  } catch (err) {
    next(err);
  }
};

// --- DELIVERY BOYS ---
exports.getDeliveryBoys = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const query = { $or: [{ role: "delivery_boy" }, { delivery_status: "pending" }] };
    const total = await User.countDocuments(query);
    const boys = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = boys.map(v => ({
      id: v._id,
      name: v.name,
      email: v.email,
      mobile_no: v.mobile_no,
      city: v.city,
      vehicle_details: v.vehicle_details,
      delivery_status: v.delivery_status,
      document_url: v.document_url,
      id_proof_url: v.id_proof_url,
      created_at: v.createdAt
    }));
    paginatedResponse(res, formatted, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.updateDeliveryBoyStatus = async (req, res, next) => {
  try {
    const { status, message } = req.body;
    const updateData = { delivery_status: status };
    if (status === "approved") {
      updateData.role = "delivery_boy";
    } else if (status === "rejected") {
      updateData.rejection_reason = message;
    }

    const boy = await User.findOneAndUpdate(
      { _id: req.params.id }, 
      updateData, 
      { new: true }
    );
    if (!boy) return res.status(404).json({ error: "User not found" });

    const notificationData = {
      user_id: boy._id,
      type: "delivery_status",
      message: `Your delivery boy application has been ${status}${message ? ': ' + message : '.'}`
    };
    await Notification.create(notificationData);
    socketUtil.sendNotification(boy._id, notificationData);

    res.json({ message: "Delivery Boy status updated successfully" });
  } catch (err) {
    next(err);
  }
};

// --- EQUIPMENT APPROVALS ---
exports.getEquipmentApprovals = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const total = await Equipment.countDocuments({ status: "pending" });
    const equipment = await Equipment.find({ status: "pending" })
      .populate("vendor_id", "name shop_name")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const formatted = equipment.map(e => ({
      id: e._id,
      name: e.name,
      vendor_name: e.vendor_id ? e.vendor_id.name : "Unknown",
      shop_name: e.vendor_id ? e.vendor_id.shop_name : "Unknown",
      status: e.status,
      created_at: e.createdAt
    }));

    paginatedResponse(res, formatted, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.updateEquipmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const eq = await Equipment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    res.json({ message: `Equipment ${status} successfully` });
  } catch (err) {
    next(err);
  }
};

// --- EQUIPMENT CRUD ---
exports.createEquipment = async (req, res, next) => {
  try {
    const { name, description, category, price, quantity, city } = req.body;
    const image = req.file ? (req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`) : null;
    
    // City and Category are now required by validation, but we check here too for safety
    if (!name || !price || !quantity) return res.status(400).json({ error: "Missing required fields (name, price, quantity)" });

    const eq = await Equipment.create({
      name, description, category, price, quantity, city, image,
      status: 'approved' // Admin added is automatically approved
    });
    res.json({ message: "Equipment added", id: eq._id });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminEquipment = async (req, res, next) => {
  try {
    const { name, description, category, price, quantity, city } = req.body;
    const updates = { name, description, category, price, quantity, city, status: 'approved' };
    if (req.file) updates.image = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;

    const eq = await Equipment.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    res.json({ message: "Equipment updated", id: eq._id });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdminEquipment = async (req, res, next) => {
  try {
    await Equipment.findByIdAndDelete(req.params.id);
    res.json({ message: "Equipment deleted" });
  } catch (err) {
    next(err);
  }
};

// --- ORDERS/RENTAL REQUESTS ---
exports.getRentalRequests = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    
    // Filter to only show Admin-owned equipment rentals
    const rentals = await Rental.find()
      .populate({
        path: "equipment_id",
        match: { vendor_id: null }
      })
      .populate("user_id", "name email mobile_no")
      .populate("delivery_boy_id", "name mobile_no")
      .sort({ start_date: 1, createdAt: -1 });

    const adminRentals = rentals.filter(r => r.equipment_id != null);
    const total = adminRentals.length;
    const paginated = adminRentals.slice(offset, offset + limit);

    paginatedResponse(res, paginated, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// --- RETURNS ---
exports.getReturns = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const total = await Rental.countDocuments({ status: { $in: ["return_requested", "returned"] } });
    const returns = await Rental.find({ status: { $in: ["return_requested", "returned"] } })
      .populate("user_id", "name")
      .populate("equipment_id", "name")
      .populate("delivery_boy_id", "name mobile_no")
      .sort({ start_date: 1, updatedAt: -1 })
      .skip(offset)
      .limit(limit);

    paginatedResponse(res, returns, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// --- UPDATE REQUESTS ---
exports.getUpdateRequests = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const total = await VendorUpdateRequest.countDocuments({ status: "pending" });
    const requests = await VendorUpdateRequest.find({ status: "pending" })
      .populate("vendor_id", "name shop_name")
      .populate("equipment_id", "name")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    paginatedResponse(res, requests, total, page, limit);
  } catch (err) {
    next(err);
  }
};

exports.processUpdateRequest = async (req, res, next) => {
  try {
    const { action } = req.body;
    const request = await VendorUpdateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (action === "approved") {
      if (request.request_type === "edit") {
        await Equipment.findByIdAndUpdate(request.equipment_id, request.details);
      } else if (request.request_type === "delete") {
        await Equipment.findByIdAndDelete(request.equipment_id);
      } else if (request.request_type === "add") {
        await Equipment.create({ ...request.details, vendor_id: request.vendor_id, status: "approved" });
      }
    }
    request.status = action;
    await request.save();

    res.json({ message: `Request ${action} successfully` });
  } catch (err) {
    next(err);
  }
};

exports.updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const rental = await Rental.findById(req.params.id).populate("equipment_id");

    if (!rental) return res.status(404).json({ error: "Rental not found" });

    // Ensure it's admin equipment
    if (rental.equipment_id && rental.equipment_id.vendor_id != null) {
      return res.status(403).json({ error: "Unauthorized: This is a vendor's equipment. They must approve it." });
    }

    const allowedStatuses = ["approved", "ready_for_pickup", "picked_up", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status update" });
    }

    if (status === "approved") {
      rental.status = "approved";
      // Auto-assignment removed as per request to allow manual assignment by admin/vendor later
    } else if (status === "ready_for_pickup") {
      rental.delivery_status = "ready_for_pickup";
    } else if (status === "picked_up") {
      rental.delivery_status = "delivered";
      rental.status = "active";
      rental.payment_status = "paid"; 
    } else if (status === "rejected") {
      rental.status = "rejected";
    }

    await rental.save();

    res.json({ success: true, message: `Admin order updated to ${status}` });
  } catch (err) {
    next(err);
  }
};

// --- CACHE STATS ---
exports.getCacheStats = (req, res) => {
  res.json({ success: true, message: "Cache statistics not applicable in Mongoose refactor." });
};

// --- ASSIGN DELIVERY BOY ---
exports.assignDeliveryBoy = async (req, res, next) => {
  try {
    const { delivery_boy_id } = req.body;
    const rental = await Rental.findById(req.params.id);

    if (!rental) return res.status(404).json({ error: "Rental not found" });

    const deliveryBoy = await User.findOne({ _id: delivery_boy_id, role: 'delivery_boy' });
    if (!deliveryBoy) return res.status(404).json({ error: "Delivery boy not found or invalid role" });

    rental.delivery_boy_id = delivery_boy_id;
    rental.delivery_status = 'assigned';
    await rental.save();

    res.json({ success: true, message: "Order assigned to delivery boy successfully" });
  } catch (err) {
    next(err);
  }
};

exports.assignDeliveryBoy = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ error: "Rental not found" });

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
  } catch (error) {
    next(error);
  }
};
