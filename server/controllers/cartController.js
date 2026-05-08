const Cart = require("../models/Cart");
const Equipment = require("../models/Equipment");
const mongoose = require("mongoose");

// GET /api/cart
exports.getCart = async (req, res, next) => {
  try {
    const cartItems = await Cart.find({ user_id: req.user.id })
      .populate("equipment_id", "name price image quantity");

    // Format the response to match the frontend expectations
    const formattedData = cartItems.map(item => ({
      id: item._id,
      cart_quantity: item.quantity,
      start_date: item.start_date,
      end_date: item.end_date,
      equipment_id: item.equipment_id ? item.equipment_id._id : null,
      name: item.equipment_id ? item.equipment_id.name : "Unknown",
      price: item.equipment_id ? item.equipment_id.price : 0,
      image: item.equipment_id ? item.equipment_id.image : "",
      stock: item.equipment_id ? item.equipment_id.quantity : 0
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    next(error);
  }
};

// POST /api/cart
exports.addToCart = async (req, res, next) => {
  try {
    const { equipment_id, quantity = 1, start_date, end_date } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(equipment_id)) {
        return res.status(400).json({ error: "Invalid equipment ID" });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) return res.status(404).json({ error: "Item not found" });

    if (equipment.quantity < quantity) {
      return res.status(400).json({ error: "Not enough stock available" });
    }

    const parsedStart = start_date ? new Date(start_date) : null;
    const parsedEnd = end_date ? new Date(end_date) : null;

    let cartItem = await Cart.findOne({
      user_id: req.user.id,
      equipment_id,
      start_date: parsedStart,
      end_date: parsedEnd
    });

    if (cartItem) {
      const newQty = cartItem.quantity + parseInt(quantity, 10);
      if (newQty > equipment.quantity) return res.status(400).json({ error: "Cannot add more than stock" });
      
      cartItem.quantity = newQty;
      await cartItem.save();
      return res.json({ message: "Cart updated" });
    } else {
      await Cart.create({
        user_id: req.user.id,
        equipment_id,
        quantity,
        start_date: parsedStart,
        end_date: parsedEnd
      });
      return res.json({ message: "Added to cart" });
    }
  } catch (error) {
    next(error);
  }
};

// PUT /api/cart/:id
exports.updateCart = async (req, res, next) => {
  try {
    const { quantity, start_date, end_date } = req.body;
    
    const cartItem = await Cart.findOne({ _id: req.params.id, user_id: req.user.id }).populate("equipment_id");
    if (!cartItem) return res.status(404).json({ error: "Cart item not found" });

    if (quantity !== undefined) {
      if (quantity <= 0) return res.status(400).json({ error: "Quantity must be at least 1" });
      if (!cartItem.equipment_id || cartItem.equipment_id.quantity < quantity) {
        return res.status(400).json({ error: "Requested quantity exceeds available stock" });
      }
      cartItem.quantity = quantity;
    }

    if (start_date !== undefined) cartItem.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) cartItem.end_date = end_date ? new Date(end_date) : null;

    await cartItem.save();
    
    res.json({ message: "Cart updated successfully" });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart/:id
exports.deleteCart = async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    res.json({ message: "Removed from cart" });
  } catch (error) {
    next(error);
  }
};
