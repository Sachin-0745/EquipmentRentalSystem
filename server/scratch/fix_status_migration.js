const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/User");

const fixStatusDefaults = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB for migration...");

    // Find users who are role 'user' and have 'pending' status but no application data
    // For vendors, no shop_name. For delivery, no vehicle_number/details.
    
    // Actually, to be safe, I'll just clear 'pending' for all 'user' roles 
    // and let them apply again if needed, or check if they have shop_name.
    
    const users = await User.find({ role: 'user' });
    let count = 0;
    for (let user of users) {
      let changed = false;
      
      // If they don't have shop_name, they shouldn't be 'pending' vendor
      if (user.vendor_status === 'pending' && !user.shop_name) {
        user.vendor_status = null;
        changed = true;
      }
      
      // If they don't have vehicle_number/details, they shouldn't be 'pending' delivery
      if (user.delivery_status === 'pending' && !user.vehicle_number && !user.vehicle_details) {
        user.delivery_status = null;
        changed = true;
      }
      
      if (changed) {
        await user.save();
        count++;
      }
    }

    console.log(`Successfully updated ${count} users.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await mongoose.connection.close();
  }
};

fixStatusDefaults();
