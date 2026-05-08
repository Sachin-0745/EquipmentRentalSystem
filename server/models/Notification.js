const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Removed required: true to support admin_alerts
  type: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });

// ── TASK 1: Indexing Audit ──────────────────────────────────────────────────
// Most frequent query: get all notifications for a specific user
notificationSchema.index({ user_id: 1, createdAt: -1 }, { background: true });
// Unread count queries
notificationSchema.index({ user_id: 1, is_read: 1 }, { background: true });

module.exports = mongoose.model("Notification", notificationSchema);
