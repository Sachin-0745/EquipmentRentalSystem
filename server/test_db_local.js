const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;
console.log('Testing connection to:', uri.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
    process.exit(1);
  });
