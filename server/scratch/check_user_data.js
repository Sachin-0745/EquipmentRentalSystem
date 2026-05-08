const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const checkMaanSingh = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'sachinmeena45007@gmail.com' });
    console.log("User Data for Maan Singh:");
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
};

checkMaanSingh();
