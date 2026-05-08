const Rental = require("../models/Rental");
const Equipment = require("../models/Equipment");
const Notification = require("../models/Notification");

exports.verifyReturn = async (req, res, next) => {
  try {
    const { action, condition_notes, refund_amount } = req.body;
    const rentalId = req.params.id;

    const rental = await Rental.findById(rentalId).populate("equipment_id");
    if (!rental) return res.status(404).json({ error: "Rental not found" });

    // Validate access (Vendor who owns the equipment or Admin)
    const isOwner = rental.equipment_id && rental.equipment_id.vendor_id && 
                    rental.equipment_id.vendor_id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized to verify this return" });
    }

    if (action === "approved" || action === "approve") {
      rental.status = "completed";
      rental.delivery_status = "returned";
      
      // Update equipment availability
      if (rental.equipment_id) {
        await Equipment.findByIdAndUpdate(rental.equipment_id._id, {
          $inc: { quantity: rental.quantity }
        });
      }

      await Notification.create({
        user_id: rental.user_id,
        type: "return_approved",
        message: `Your return for ${rental.equipment_id ? rental.equipment_id.name : 'equipment'} has been approved. Refund amount: ${refund_amount || 0}`
      });

    } else if (action === "rejected" || action === "reject") {
      rental.status = "active";
      // Delivery status goes back or stays depending on business logic
      rental.delivery_status = "delivered";

      await Notification.create({
        user_id: rental.user_id,
        type: "return_rejected",
        message: `Your return for ${rental.equipment_id ? rental.equipment_id.name : 'equipment'} was rejected. Notes: ${condition_notes || "None"}`
      });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await rental.save();
    res.json({ success: true, message: `Return ${action} successfully.` });
  } catch (err) {
    next(err);
  }
};
