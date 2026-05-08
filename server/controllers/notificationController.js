const Notification = require("../models/Notification");

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    const formatted = notifications.map(n => ({
      id: n._id,
      user_id: n.user_id,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.createdAt
    }));
    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user_id: req.user.id, is_read: false }, { is_read: true });
    res.json({ success: true, message: "Notifications marked as read" });
  } catch (err) {
    next(err);
  }
};
