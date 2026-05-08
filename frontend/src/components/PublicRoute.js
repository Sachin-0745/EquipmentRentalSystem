import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { token } = useContext(AuthContext);

  if (token) {
    // If logged in, redirect away from public auth pages
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
