const mongoose = require('mongoose');
require('dotenv').config();
const Equipment = require('./models/Equipment');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const eq = await Equipment.findOne({'reviews.0': {$exists: true}}).sort({updatedAt: -1});
  if (!eq) {
    console.log('No reviews found');
  } else {
    const r = eq.reviews[eq.reviews.length - 1];
    console.log(JSON.stringify({
      eq: eq.name,
      reviewCount: eq.reviews.length,
      lastReview: {
        rating: r.rating,
        comment: r.comment,
        userId: r.user_id
      }
    }, null, 2));
  }
  process.exit();
}

check();
