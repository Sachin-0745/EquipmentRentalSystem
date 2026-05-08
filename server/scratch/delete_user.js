const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'email is_verified');
    console.log("Current Users in DB:");
    users.forEach(u => console.log(`- ${u.email} | Verified: ${u.is_verified}`));
  } catch (err) {
    console.error("Error listing users:", err);
  } finally {
    await mongoose.connection.close();
  }
};

listUsers();
