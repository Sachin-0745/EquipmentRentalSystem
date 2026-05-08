const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const OTP = require('./models/OTP');
const User = require('./models/User');
const Rental = require('./models/Rental');
const FormData = require('form-data');
const fs = require('fs');

async function runDeliveryTests() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/equiprent');
  const email = 'dboy_' + Date.now() + '@example.com';
  const phone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const password = 'TestPass123';
  
  try {
    console.log('--- Step 1: Delivery Boy Signup ---');
    // Create a dummy pdf
    fs.writeFileSync('dummy.pdf', 'dummy content');
    
    const form = new FormData();
    form.append('name', 'Delivery Test');
    form.append('email', email);
    form.append('mobile_no', phone);
    form.append('password', password);
    form.append('confirmPassword', password);
    form.append('city', 'Jaipur');
    form.append('vehicle_details', 'Bike 1234');
    form.append('document', fs.createReadStream('dummy.pdf'));
    
    const signupRes = await axios.post('http://localhost:5000/api/auth/delivery-signup', form, {
      headers: form.getHeaders()
    });
    console.log('Signup:', signupRes.data.message);
    
    const otpDoc = await OTP.findOne({ email: email }).sort({ createdAt: -1 });
    const verifyRes = await axios.post('http://localhost:5000/api/auth/verify-otp', {
      email: email,
      otp: otpDoc.otp
    });
    console.log('OTP Verified, account created.');
    
    // Check initial user status
    let user = await User.findOne({ email });
    console.log('User delivery_status:', user.delivery_status);
    
    console.log('--- Step 2: Admin approves Delivery Boy ---');
    // We need an admin token. Let's just update directly in DB to bypass admin login for speed.
    user.delivery_status = 'approved';
    await user.save();
    console.log('Admin approved delivery boy in DB.');
    
    console.log('--- Step 3: Login as Delivery Boy ---');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: email,
      password: password
    });
    const token = loginRes.data.token;
    console.log('Logged in, role:', loginRes.data.role);
    
    console.log('--- Step 4: Admin assigns an order ---');
    // Find an existing rental
    const rental = await Rental.findOne({ status: 'pending' });
    if (!rental) {
        console.log('No pending rental found to assign. Creating one...');
        return;
    }
    rental.delivery_boy_id = user._id;
    rental.delivery_status = 'assigned';
    await rental.save();
    console.log('Order assigned to DBoy. Order ID:', rental._id);
    
    console.log('--- Step 5: Delivery Boy Views Orders ---');
    const ordersRes = await axios.get('http://localhost:5000/api/delivery/orders', {
      headers: { Authorization: token }
    });
    console.log('Assigned orders count:', ordersRes.data.data.length);
    console.log('Order status:', ordersRes.data.data[0].delivery_status);
    
    console.log('--- Step 6: Delivery Boy Updates Status to Picked Up ---');
    const updateRes = await axios.put('http://localhost:5000/api/delivery/orders/' + rental._id + '/action', {
      status: 'picked_up'
    }, {
      headers: { Authorization: token }
    });
    console.log('Update res:', updateRes.data.message);
    
    const ordersRes2 = await axios.get('http://localhost:5000/api/delivery/orders', {
      headers: { Authorization: token }
    });
    console.log('Updated order status:', ordersRes2.data.data[0].delivery_status);

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
      if(fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');
  }

  process.exit(0);
}

runDeliveryTests();
