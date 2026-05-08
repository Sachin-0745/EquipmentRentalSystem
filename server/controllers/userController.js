const User = require("../models/User");

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure backwards compatibility with frontend expectations
    const formatted = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobile_no: user.mobile_no,
      address: user.address || "",
      city: user.city || "",
      documents: user.document_url || null,
      role: user.role
    };

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, address, mobile_no, city } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (mobile_no) updates.mobile_no = mobile_no;
    if (city) updates.city = city;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    next(err);
  }
};
