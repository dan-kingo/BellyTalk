import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      <div className="pt-16 h-full">
        <div className="flex h-full overflow-hidden">
          {user && (
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
