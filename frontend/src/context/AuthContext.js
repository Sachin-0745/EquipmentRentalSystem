import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));

  useEffect(() => {
    if (token) {
      setUser({ token, role });
    } else {
      setUser(null);
    }
  }, [token, role]);

  const login = (newToken, newRole) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const logout = async () => {
    try {
      const API = (await import("../services/api")).default;
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Server-side logout failed:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setToken(null);
      setRole(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
