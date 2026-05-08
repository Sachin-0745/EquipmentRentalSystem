const mongoose = require('mongoose');
require('dotenv').config();
const Equipment = require('./models/Equipment');

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  const userId = "69f65bfe23951c027b81298d";
  
  const result = await Equipment.updateMany(
    { "reviews.user_id": userId },
    { $pull: { reviews: { user_id: userId } } }
  );
  
  console.log(`Removed ${result.modifiedCount} reviews for user ${userId}`);
  process.exit();
}

clean();
