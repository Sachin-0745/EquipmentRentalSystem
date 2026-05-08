let io;

/**
 * Socket.io initialization and utility methods
 */
module.exports = {
  init: (server) => {
    io = require("socket.io")(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true
      }
    });

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("join", (userId) => {
        if (userId) {
          socket.join(userId.toString());
          console.log(`User ${userId} joined their personal notification room.`);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },

  /**
   * Send a real-time notification to a specific user
   * @param {string} userId - Target user ID
   * @param {object} data - Notification data
   */
  sendNotification: (userId, data) => {
    if (io && userId) {
      io.to(userId.toString()).emit("notification", data);
    }
  },

  /**
   * Broadcast to all connected clients (e.g., admin announcements)
   */
  broadcast: (event, data) => {
    if (io) {
      io.emit(event, data);
    }
  }
};
