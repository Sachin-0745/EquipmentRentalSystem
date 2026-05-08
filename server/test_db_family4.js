const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const options = {
  family: 4
};

console.log('Testing connection to:', uri.replace(/:([^@]+)@/, ':****@'), 'with family: 4');

mongoose.connect(uri, options)
  .then(() => {
    console.log('Successfully connected to MongoDB with family: 4');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed with family: 4');
    console.error(err);
    process.exit(1);
  });
