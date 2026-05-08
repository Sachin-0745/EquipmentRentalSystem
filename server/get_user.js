const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function getTestUser() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/equiprent');
  const user = await User.findOne({ role: 'user' });
  if (user) {
    console.log(user.email);
  } else {
    console.log('No user found');
  }
  process.exit(0);
}
getTestUser();
