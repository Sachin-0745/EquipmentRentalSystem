const Equipment = require("../models/Equipment");

/**
 * Service to handle business logic for equipment operations (MongoDB Version)
 */
exports.getPaginatedEquipment = async (mongoFilters, limit, offset) => {
  try {
    const total = await Equipment.countDocuments(mongoFilters);
    
    const now = new Date();
    // Aggregation pipeline to calculate available quantity and fetch data
    const data = await Equipment.aggregate([
      { $match: mongoFilters },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "vendor_id",
          foreignField: "_id",
          as: "vendor"
        }
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
          as: "activeRentals"
        }
      },
      {
        $addFields: {
          rented_quantity: { $sum: "$activeRentals.quantity" },
          available_quantity: { $subtract: ["$quantity", { $sum: "$activeRentals.quantity" }] },
          avg_rating: { $avg: "$reviews.rating" },
          review_count: { $size: { $ifNull: ["$reviews", []] } },
          shop_name: "$vendor.shop_name",
          store_address: "$vendor.address",
          id: { $toString: "$_id" }
        }
      },
      {
        $project: {
          activeRentals: 0,
          vendor: 0,
          reviews: 0
        }
      }
    ]);

    return { total, data };
  } catch (error) {
    throw error;
  }
};
