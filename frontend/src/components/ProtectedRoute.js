import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role } = useContext(AuthContext);
  const location = useLocation();

  if (!token) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role not authorized, redirect to dashboard or unauthorized page
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
