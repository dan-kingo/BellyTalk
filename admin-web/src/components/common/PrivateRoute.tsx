import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AppShellSkeleton } from "./PageSkeletons";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
