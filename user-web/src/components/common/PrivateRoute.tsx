import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../types";
import Skeleton from "./Skeleton";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-full hidden md:block" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
          <aside className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-4">
            <div className="space-y-2">
              {Array.from({ length: 11 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg"
                >
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  {index === 3 || index === 4 || index === 6 ? (
                    <Skeleton className="h-5 w-5 rounded-full" />
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-10 w-52" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
