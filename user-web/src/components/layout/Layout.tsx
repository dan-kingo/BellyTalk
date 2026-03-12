import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDoctorUnderOnboarding =
    profile?.role === "doctor" && profile?.role_status !== "approved";
  const hideAppChrome =
    isDoctorUnderOnboarding ||
    location.pathname === "/doctor/complete-profile" ||
    location.pathname === "/doctor/pending-approval";

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {!hideAppChrome && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      )}

      <div className={`${hideAppChrome ? "pt-0" : "pt-16"} h-full`}>
        <div className="flex h-full overflow-hidden">
          {user && !hideAppChrome && (
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}
          <main
            id="app-main-scroll"
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
