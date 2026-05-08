const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendOTP = require("../utils/sendMail");
const logger = require("../utils/logger");

const User = require("../models/User");
const OTP = require("../models/OTP");
const Notification = require("../models/Notification");

// OTP generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// username generator
const generateUsername = () => "user" + Math.floor(Math.random() * 100000);

// SIGNUP
exports.signup = async (req, res) => {
  let { name, email, mobile_no, password, confirmPassword } = req.body;

  if (!name || !email || !mobile_no || !password || !confirmPassword)
    return res.status(400).json({ message: "All fields required" });

  name = name.trim();
  email = email.trim().toLowerCase();
  mobile_no = mobile_no.trim();

  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(name))
    return res.status(400).json({ message: "Name must not contain numbers or special characters" });

  const mobileRegex = /^[5-9]\d{9}$/;
  if (!mobileRegex.test(mobile_no))
    return res.status(400).json({ message: "Mobile number must be 10 digits and start with 5, 6, 7, 8, or 9" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: "Invalid email address" });

  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  if (password.length < 8 || password.length > 12)
    return res.status(400).json({ message: "Password must be 8-12 characters long" });

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { mobile_no }] });
    if (existingUser) return res.status(400).json({ message: "Email or Phone already exists" });

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    // Delete any existing pending OTP/User data for this email
    await OTP.deleteMany({ email });

    await OTP.create({
      email, 
      otp, 
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      userData: {
        name,
        mobile_no,
        password: hash,
        role: 'user'
      }
    });

    await sendOTP(email, otp);

    logger.info(`Signup Request: OTP sent to ${email}`);
    res.json({ success: true, message: "Registration initiated. OTP sent to email." });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
};

// VENDOR SIGNUP
exports.vendorSignup = async (req, res) => {
  let { name, email, mobile_no, password, confirmPassword, shop_name, address, city } = req.body;
  
  const getFileUrl = (file) => {
    if (!file) return null;
    return file.path.startsWith("http") ? file.path : `/uploads/${file.filename}`;
  };

  const document_url = req.files?.document ? getFileUrl(req.files.document[0]) : null;
  const id_proof_url = req.files?.id_proof ? getFileUrl(req.files.id_proof[0]) : null;

  if (!name || !email || !mobile_no || !shop_name || !address || !city)
    return res.status(400).json({ message: "Basic shop and contact details are required" });

  name = name.trim();
  email = email.trim().toLowerCase();
  mobile_no = mobile_no.trim();
  shop_name = shop_name.trim();

  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!nameRegex.test(name))
    return res.status(400).json({ message: "Name must not contain numbers" });

  const existingUser = await User.findOne({ $or: [{ email }, { mobile_no }] });

  if (!existingUser) {
    if (!password || !confirmPassword)
      return res.status(400).json({ message: "Password is required for new users" });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });
    if (password.length < 8 || password.length > 12)
      return res.status(400).json({ message: "Password must be 8-12 chars long" });
  }

  try {
    
    // If user exists and is already a vendor or delivery boy, reject
    if (existingUser && existingUser.role !== 'user') {
      return res.status(400).json({ message: "An account with this email/phone already exists with a professional role." });
    }

    // If existing user is already pending, reject
    if (existingUser && existingUser.vendor_status === 'pending') {
      return res.status(400).json({ message: "You already have a pending vendor application." });
    }

    const hash = password ? await bcrypt.hash(password, 10) : (existingUser ? existingUser.password : null);
    const otp = generateOTP();

    await OTP.deleteMany({ email });

    await OTP.create({
      email, 
      otp, 
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      userData: {
        name,
        email,
        mobile_no,
        password: hash,
        role: 'vendor', // This will be the TARGET role after approval
        shop_name,
        address,
        city,
        document_url,
        id_proof_url
      }
    });

    await sendOTP(email, otp);

    logger.info(`Vendor Application/Signup Request: OTP sent to ${email}`);
    res.json({ success: true, message: "Vendor application initiated. OTP sent to email." });
  } catch (error) {
    console.error("Vendor Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
};

// DELIVERY BOY SIGNUP
exports.deliverySignup = async (req, res) => {
  let { name, email, mobile_no, password, confirmPassword, city, vehicle_details } = req.body;
  
  const getFileUrl = (file) => {
    if (!file) return null;
    return file.path.startsWith("http") ? file.path : `/uploads/${file.filename}`;
  };

  const document_url = req.files?.document ? getFileUrl(req.files.document[0]) : null;
  const id_proof_url = req.files?.id_proof ? getFileUrl(req.files.id_proof[0]) : null;

  if (!name || !email || !mobile_no || !city)
    return res.status(400).json({ message: "Basic driver and contact details are required" });

  name = name.trim();
  email = email.trim().toLowerCase();
  mobile_no = mobile_no.trim();

  try {
    let user = await User.findOne({ $or: [{ email }, { mobile_no }] });

    if (user) {
      // EXISTING USER BRANCH: Skip OTP, just update status
      if (user.role !== 'user') {
        return res.status(400).json({ message: "An account with this email/phone already exists with a professional role." });
      }

      if (user.delivery_status === 'pending') {
        return res.status(400).json({ message: "You already have a pending delivery application." });
      }

      user.name = name;
      user.mobile_no = mobile_no;
      user.city = city;
      user.vehicle_details = vehicle_details;
      user.document_url = document_url;
      user.id_proof_url = id_proof_url;
      user.delivery_status = 'pending';
      await user.save();

      // Create notification for Admin
      await Notification.create({
        user_id: user._id,
        type: 'admin_alert',
        message: `New delivery boy application from ${user.name} (${user.city}).`
      });

      logger.info(`Delivery Boy Application Submitted (Existing User): ${email}`);
      return res.json({ success: true, message: "Application submitted successfully. Pending admin approval.", requiresOTP: false });
    } else {
      // NEW USER BRANCH: Send OTP for identity verification
      if (!password || !confirmPassword)
        return res.status(400).json({ message: "Password is required for new accounts" });
      if (password !== confirmPassword)
        return res.status(400).json({ message: "Passwords do not match" });
      
      const hash = await bcrypt.hash(password, 10);
      const otp = generateOTP();

      await OTP.deleteMany({ email });
      await OTP.create({
        email, 
        otp, 
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        userData: {
          name,
          mobile_no,
          password: hash,
          role: 'delivery_boy', // verify-otp will set this role correctly if role matches
          city,
          vehicle_details,
          document_url,
          id_proof_url,
          delivery_status: 'pending'
        }
      });

      await sendOTP(email, otp);

      logger.info(`Delivery Boy Signup: OTP sent to ${email}`);
      return res.json({ success: true, message: "OTP sent to email for verification.", requiresOTP: true });
    }
  } catch (error) {
    console.error("Delivery Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
};

// LOGIN
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid email or password" });

    if (!user.is_verified) return res.status(400).json({ success: false, message: "Please verify your account first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Invalid email or password" });


    const token = jwt.sign({ email: user.email, role: user.role, id: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret", { expiresIn: "7d" });

    // Store refresh token in DB for revocation support
    user.refresh_token = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User Login: ${user.email} (${user.role}) logged in successfully`);
    res.json({ message: "Login success", token, role: user.role });
  } catch (error) {
    logger.error("Login Error:", error.message);
    next(error);
  }
};

// VERIFY OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const validOtp = await OTP.findOne({ email, otp, expires_at: { $gt: new Date() } });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP" });

    // Only create user after verification
    const { userData } = validOtp;
    if (!userData || !userData.name) {
      return res.status(400).json({ message: "Signup session expired. Please sign up again." });
    }

    const username = generateUsername();
    
    // Check if user already exists (Upgrade case)
    let user = await User.findOne({ email });
    
    if (user) {
      // UPGRADE EXISTING USER
      const updateData = {
        is_verified: true,
        // Update basic info if changed
        name: userData.name || user.name,
        mobile_no: userData.mobile_no || user.mobile_no,
        // Set application status but DON'T change role yet
        vendor_status: userData.role === 'vendor' ? 'pending' : user.vendor_status,
        delivery_status: userData.role === 'delivery_boy' ? 'pending' : user.delivery_status,
      };

      if (userData.role === 'vendor') {
        updateData.shop_name = userData.shop_name;
        updateData.address = userData.address;
        updateData.city = userData.city;
        updateData.document_url = userData.document_url;
        updateData.id_proof_url = userData.id_proof_url;
      } else if (userData.role === 'delivery_boy') {
        updateData.city = userData.city;
        updateData.vehicle_details = userData.vehicle_details;
        updateData.document_url = userData.document_url;
        updateData.id_proof_url = userData.id_proof_url;
      }

      user = await User.findOneAndUpdate({ email }, updateData, { new: true });
      logger.info(`User Upgrade Application: ${email} applied for ${userData.role}`);
    } else {
      // NEW USER REGISTRATION
      user = await User.create({
        ...userData.toObject(),
        email,
        username,
        is_verified: true,
        vendor_status: userData.role === 'vendor' ? 'pending' : undefined,
        delivery_status: userData.role === 'delivery_boy' ? 'pending' : undefined
      });
      logger.info(`New User Created: ${email} as ${user.role} (pending approval if professional)`);
    }

    // Create notification for Admin
    if (userData.role === 'vendor') {
      await Notification.create({
        user_id: user._id,
        type: 'admin_alert',
        message: `New vendor application from ${user.shop_name || user.name}.`
      });
    } else if (userData.role === 'delivery_boy') {
      await Notification.create({
        user_id: user._id,
        type: 'admin_alert',
        message: `New delivery boy application from ${user.name} (${user.city}).`
      });
    }

    // Delete OTP after use
    await OTP.deleteOne({ _id: validOtp._id });

    const token = jwt.sign({ email: user.email, role: user.role, id: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret", { expiresIn: "7d" });

    user.refresh_token = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, message: "Verification successful. Application submitted.", token, role: user.role });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Database Error" });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User with this email does not exist" });

    const otp = generateOTP();
    
    // Clear old OTPs for this email
    await OTP.deleteMany({ email });

    await OTP.create({
      email, otp, expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });
    
    await sendOTP(email, otp);
    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (!email || !otp || !newPassword || !confirmPassword)
    return res.status(400).json({ message: "All fields are required" });

  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });

  if (newPassword.length < 8 || newPassword.length > 12)
    return res.status(400).json({ message: "Password must be 8-12 characters long" });

  try {
    const validOtp = await OTP.findOne({ email, otp, expires_at: { $gt: new Date() } });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    // Delete OTP after use
    await OTP.deleteOne({ _id: validOtp._id });

    res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Database Error" });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret");
    const user = await User.findById(decoded.id);
    
    // Revocation check: verify token matches the one stored in DB
    if (!user || !user.is_verified || user.refresh_token !== refreshToken) {
      return res.status(403).json({ success: false, message: "Invalid or revoked refresh token" });
    }

    const newAccessToken = jwt.sign({ email: user.email, role: user.role, id: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "15m" });
    res.json({ success: true, token: newAccessToken, role: user.role });
  } catch (err) {
    res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.header("Authorization");

    // 1. Invalidate Refresh Token in DB
    await User.findByIdAndUpdate(userId, { refresh_token: null });

    // 2. Blacklist Access Token (if provided)
    if (token) {
      const TokenBlacklist = require("../models/TokenBlacklist");
      await TokenBlacklist.create({ 
        token, 
        expires_at: new Date(Date.now() + 60 * 60 * 1000) 
      });
    }

    // 3. Clear Cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    logger.info(`User Logout: User ID ${userId} logged out and tokens revoked`);
    res.json({ success: true, message: "Logged out successfully and tokens revoked" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};