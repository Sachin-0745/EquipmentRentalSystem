const equipmentService = require("../services/equipmentService");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const { parsePagination, paginatedResponse } = require("../utils/pagination");
const { ok, fail } = require("../utils/response");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

/**
 * GET /api/equipment
 * List approved equipment with optional city/category/search filters + pagination.
 * Existing API — NO BREAKING CHANGES.
 */
exports.getEquipment = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const mongoFilters = { status: "approved" };
    if (req.query.city) {
      const escapedCity = req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilters.city = { $regex: new RegExp(`^${escapedCity}$`, "i") };
    }
    if (req.query.category) mongoFilters.category = req.query.category;
    if (req.query.search) {
      const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilters.name = { $regex: escapedSearch, $options: "i" };
    }

    const { total, data } = await equipmentService.getPaginatedEquipment(mongoFilters, limit, offset);
    paginatedResponse(res, data, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/equipment/search
 * TASK 1: Advanced search — full-text, price range, date availability.
 * New endpoint — no existing code changed.
 *
 * Query params:
 *   q          – text search on name + description
 *   min_price  – minimum price per day
 *   max_price  – maximum price per day
 *   start_date – ISO date (availability start)
 *   end_date   – ISO date (availability end)
 *   city       – city filter
 *   category   – category filter
 *   page, limit – pagination
 */
exports.searchEquipment = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { q, min_price, max_price, start_date, end_date, city, category } = req.query;

    // Build base match filter
    const match = { status: "approved" };
    if (city)     match.city     = city;
    if (category) match.category = category;

    // Full-text search on name + description
    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { name:        { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
      ];
    }

    // Price range
    if (min_price || max_price) {
      match.price = {};
      if (min_price) match.price.$gte = parseFloat(min_price);
      if (max_price) match.price.$lte = parseFloat(max_price);
    }

    // Date-based availability: find equipment that has enough stock
    // for the requested period (not fully booked)
    let unavailableIds = [];
    if (start_date && end_date) {
      const sd = new Date(start_date);
      const ed = new Date(end_date);
      if (isNaN(sd) || isNaN(ed) || sd >= ed) {
        return res.status(400).json({ success: false, message: "Invalid date range. end_date must be after start_date." });
      }

      // Aggregate rentals that overlap with requested period
      const booked = await Rental.aggregate([
        {
          $match: {
            status: { $in: ["pending", "active"] },
            start_date: { $lte: ed },
            end_date:   { $gte: sd },
          },
        },
        {
          $group: {
            _id: "$equipment_id",
            totalRented: { $sum: "$quantity" },
          },
        },
      ]);

      // Find equipment where all stock is rented out for the period
      const equipmentMap = {};
      booked.forEach(b => { equipmentMap[b._id.toString()] = b.totalRented; });

      const allEquipment = await Equipment.find(match).select("_id quantity");
      unavailableIds = allEquipment
        .filter(eq => (equipmentMap[eq._id.toString()] || 0) >= eq.quantity)
        .map(eq => eq._id);

      if (unavailableIds.length) {
        match._id = { $nin: unavailableIds };
      }
    }

    const total = await Equipment.countDocuments(match);

    const now = new Date();
    const data = await Equipment.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "vendor_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "rentals",
          let: { equipmentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$equipment_id", "$$equipmentId"] },
                    { $eq: ["$status", "active"] },
                    { $lte: ["$start_date", now] },
                    { $gte: ["$end_date", now] }
                  ]
                }
              }
            }
          ],
          as: "activeRentals",
        },
      },
      {
        $addFields: {
          rented_quantity: { $sum: "$activeRentals.quantity" },
          available_quantity: { $subtract: ["$quantity", { $sum: "$activeRentals.quantity" }] },
          avg_rating:   { $avg: "$reviews.rating" },
          review_count: { $size: { $ifNull: ["$reviews", []] } },
          shop_name:    "$vendor.shop_name",
          store_address: "$vendor.address",
          id:           { $toString: "$_id" },
        },
      },
      { $project: { vendor: 0, reviews: 0, activeRentals: 0 } },
    ]);

    logger.info(`[Search] q="${q}" city="${city}" price=${min_price}-${max_price} dates=${start_date}→${end_date} → ${total} results`);
    paginatedResponse(res, data, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/equipment/:id
 * Get single approved equipment by ID.
 * Existing API — NO BREAKING CHANGES. Added avg_rating to response.
 */
exports.getEquipmentById = async (req, res, next) => {
  try {
    const eq = await Equipment.findOne({ _id: req.params.id, status: "approved" })
      .populate("vendor_id", "name shop_name");

    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    // TASK 3: Compute avg rating from embedded reviews (read-only aggregation)
    const reviews = eq.reviews || [];
    const avg_rating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    const formatted = {
      id:           eq._id,
      name:         eq.name,
      description:  eq.description,
      price:        eq.price,
      quantity:     eq.quantity,
      image:        eq.image,
      category:     eq.category,
      city:         eq.city,
      vendor_id:    eq.vendor_id ? eq.vendor_id._id : null,
      shop_name:    eq.vendor_id ? eq.vendor_id.shop_name : "Unknown",
      created_at:   eq.createdAt,
      avg_rating:   avg_rating ? parseFloat(avg_rating.toFixed(2)) : null,
      review_count: reviews.length,
    };

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/equipment/:id/availability
 * Check available stock for a date range.
 * Existing API — NO BREAKING CHANGES.
 */
exports.getEquipmentAvailability = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) return res.status(400).json({ error: "Missing dates" });

    const eq = await Equipment.findById(req.params.id);
    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    const overlappingRentals = await Rental.aggregate([
      {
        $match: {
          equipment_id: eq._id,
          status: { $in: ["pending", "active"] },
          $and: [
            { start_date: { $lte: new Date(end_date) } },
            { end_date:   { $gte: new Date(start_date) } },
          ],
        },
      },
      { $group: { _id: null, totalRented: { $sum: "$quantity" } } },
    ]);

    const rented = overlappingRentals.length ? overlappingRentals[0].totalRented : 0;
    res.json({ success: true, available: eq.quantity - rented, total: eq.quantity });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/equipment/:id/booked-dates
 * TASK 2: Return all date ranges that are fully booked for a given equipment.
 * Used by the frontend calendar to show unavailable dates.
 * New endpoint — read-only.
 */
exports.getBookedDates = async (req, res, next) => {
  try {
    const eq = await Equipment.findById(req.params.id).select("quantity");
    if (!eq) return res.status(404).json({ error: "Equipment not found" });

    // Fetch rentals for the next 90 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);

    const rentals = await Rental.find({
      equipment_id: eq._id,
      status: { $in: ["pending", "active"] },
      end_date:   { $gte: today },
      start_date: { $lte: maxDate },
    });

    // Create a map of date strings to total quantity rented on that day
    const bookedDates = {};
    rentals.forEach(r => {
      let current = new Date(r.start_date);
      const end   = new Date(r.end_date);
      
      // Ensure we don't loop forever if dates are weird
      let safety = 0;
      while (current <= end && safety < 365) {
        const dStr = current.toISOString().split("T")[0];
        bookedDates[dStr] = (bookedDates[dStr] || 0) + r.quantity;
        current.setDate(current.getDate() + 1);
        safety++;
      }
    });

    res.json({ 
      success: true, 
      booked_dates: bookedDates, 
      total_stock: eq.quantity 
    });
  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/equipment/bulk-upload
 * TASK 4: Admin/Vendor bulk equipment import via JSON array in body.
 * Validates each row, inserts valid ones, skips+logs invalid.
 * Does NOT overwrite existing records (insert-only).
 */
exports.bulkUpload = async (req, res, next) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Body must have an 'items' array." });
    }
    if (items.length > 200) {
      return res.status(400).json({ success: false, message: "Maximum 200 items per bulk upload." });
    }

    const REQUIRED = ["name", "price", "category", "city", "quantity"];
    const valid   = [];
    const skipped = [];

    items.forEach((item, idx) => {
      const missing = REQUIRED.filter(k => !item[k]);
      if (missing.length) {
        skipped.push({ row: idx + 1, reason: `Missing fields: ${missing.join(", ")}`, data: item });
        return;
      }
      if (isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0) {
        skipped.push({ row: idx + 1, reason: "Price must be a positive number", data: item });
        return;
      }
      if (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
        skipped.push({ row: idx + 1, reason: "Quantity must be a positive integer", data: item });
        return;
      }
      valid.push({
        name:        String(item.name).trim().slice(0, 200),
        description: item.description ? String(item.description).trim().slice(0, 1000) : "",
        price:       parseFloat(item.price),
        category:    String(item.category).trim(),
        city:        String(item.city).trim(),
        quantity:    parseInt(item.quantity),
        image:       item.image || null,
        vendor_id:   req.user.id,
        status:      "pending", // all bulk imports require admin approval
      });
    });

    let inserted = [];
    if (valid.length > 0) {
      inserted = await Equipment.insertMany(valid, { ordered: false });
    }

    // Log skipped rows for audit
    if (skipped.length > 0) {
      logger.warn(`[BulkUpload] User ${req.user.id} — ${skipped.length} rows skipped: ${JSON.stringify(skipped)}`);
    }

    logger.info(`[BulkUpload] User ${req.user.id} inserted ${inserted.length} equipment records.`);

    res.json({
      success: true,
      message: `Inserted ${inserted.length} records. ${skipped.length} skipped.`,
      inserted: inserted.length,
      skipped_count: skipped.length,
      skipped_details: skipped,
    });
  } catch (err) {
    next(err);
  }
};
