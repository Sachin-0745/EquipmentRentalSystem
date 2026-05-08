const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const listAllUsersStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'name email role vendor_status delivery_status');
    console.log("Users in DB:");
    users.forEach(u => {
      console.log(`- ${u.name} | Role: ${u.role} | Vendor: ${u.vendor_status} | Delivery: ${u.delivery_status}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
};

listAllUsersStatus();
