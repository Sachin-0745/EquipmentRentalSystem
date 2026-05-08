const mongoose = require('mongoose');
require('dotenv').config();
const Equipment = require('./models/Equipment');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const all = await Equipment.find({});
  console.log('Total Equipment:', all.length);
  all.forEach(e => {
    console.log(`- ${e.name} | Status: ${e.status} | City: ${e.city} | ID: ${e._id}`);
  });
  process.exit(0);
}

run();
