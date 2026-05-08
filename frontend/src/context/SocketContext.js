import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      autoConnect: true,
    });

    setSocket(newSocket);

    // Listen for connection
    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server");
      
      // Join a personal room if user info exists in localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.id) {
        newSocket.emit("join", user.id);
      }
    });

    // Listen for incoming notifications
    newSocket.on("notification", (data) => {
      console.log("New notification received:", data);
      
      // Show premium toast notification
      toast(data.message, {
        icon: '🔔',
        duration: 5000,
        style: {
          borderRadius: '12px',
          background: '#333',
          color: '#fff',
        },
      });

      // Optional: Sound effect
      try {
        const audio = new Audio("/notification.mp3");
        audio.play();
      } catch (e) { /* ignore */ }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Method to manually join room (e.g., after login)
  const joinRoom = (userId) => {
    if (socket && userId) {
      socket.emit("join", userId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
