const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const OTP = require('./models/OTP');
const User = require('./models/User');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/equiprent');
  const email = 'testuser_' + Date.now() + '@example.com';
  const phone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const password = 'TestPass123';
  
  try {
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      name: 'Test User',
      email: email,
      mobile_no: phone,
      password: password,
      confirmPassword: password
    });
    
    const otpDoc = await OTP.findOne({ email: email }).sort({ createdAt: -1 });
    const verifyRes = await axios.post('http://localhost:5000/api/auth/verify-otp', {
      email: email,
      otp: otpDoc.otp
    });
    
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: email,
      password: password
    });
    const token = loginRes.data.token;
    
    console.log('\n--- TC-09: Add to Cart (FR-3) ---');
    const eqRes = await axios.get('http://localhost:5000/api/equipment?limit=1');
    const equipment = eqRes.data.data[0];
    const eqId = equipment.id;
    console.log('Selected Equipment:', equipment.name);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3);
    
    const cartRes = await axios.post('http://localhost:5000/api/cart', {
      equipment_id: eqId,
      quantity: 1,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }, {
      headers: { Authorization: token }
    });
    console.log('Added to cart:', cartRes.data.message);
    
    console.log('\n--- TC-10: Cart View & Rent Calculation (FR-3 & FR-4) ---');
    const viewCartRes = await axios.get('http://localhost:5000/api/cart', {
      headers: { Authorization: token }
    });
    console.log('Cart Items:', viewCartRes.data.data.length);
    const cartItem = viewCartRes.data.data[0];
    console.log('Item in cart:', cartItem.name, '| Total Cost Calculated: Rs.', cartItem.total_price);
    
    console.log('\n--- TC-11: Checkout / Rental Request (FR-3) ---');
    const availRes = await axios.post('http://localhost:5000/api/check-availability', {
      items: [{ equipment_id: cartItem.equipment_id, quantity: 1, start_date: cartItem.start_date, end_date: cartItem.end_date }]
    }, {
      headers: { Authorization: token }
    });
    console.log('Availability check:', availRes.data.message);
    
    const checkoutRes = await axios.post('http://localhost:5000/api/rent', {
      items: [{ equipment_id: cartItem.equipment_id, quantity: 1, start_date: cartItem.start_date, end_date: cartItem.end_date }],
      delivery_type: 'pickup',
      delivery_address: 'Test Address',
      paymentMethod: 'COD'
    }, {
      headers: { Authorization: token }
    });
    console.log('Checkout successful:', checkoutRes.data.message);
    const orderId = checkoutRes.data.orderIds[0];
    console.log('Order ID created:', orderId);
    
    console.log('\n--- TC-12: Order Tracking (FR-5) ---');
    const trackRes = await axios.get('http://localhost:5000/api/rentals/track', {
      headers: { Authorization: token }
    });
    console.log('Total Orders:', trackRes.data.data.length);
    console.log('Latest Order Status:', trackRes.data.data[0].status);
    
    console.log('\n--- TC-13: Return Equipment (FR-5) ---');
    try {
      const returnRes = await axios.post('http://localhost:5000/api/rentals/return/' + orderId, {
        return_type: 'Self Return'
      }, {
        headers: { Authorization: token }
      });
      console.log('Return request:', returnRes.data.message);
    } catch(err) {
      console.log('Return request error (expected if not active):', err.response.data.error);
    }
    
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }

  process.exit(0);
}

runTests();
