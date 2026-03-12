import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Menu, Sun, Moon, LogOut, Bell } from "lucide-react";
import { toast } from "react-toastify";
import { useNotificationStore } from "../../stores/notification.store";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, profile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const notificationUnreadCount = useNotificationStore(
    (state) => state.unreadCount,
  );
  const fetchNotifications = useNotificationStore(
    (state) => state.fetchNotifications,
  );

  const notificationRole: "mother" | "doctor" | "admin" | null =
    profile?.role === "mother"
      ? "mother"
      : profile?.role === "doctor"
        ? "doctor"
        : profile?.role === "admin"
          ? "admin"
          : null;
  const canSeeNotifications = notificationRole !== null;

  useEffect(() => {
    if (!user || !notificationRole) {
      return;
    }

    fetchNotifications(notificationRole, true);
  }, [user, notificationRole, fetchNotifications]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      navigate("/login");
    } catch {
      toast.error("Failed to log out. Please try again.");
    }
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={onMenuClick}
                className="cursor-pointer lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary dark:text-secondary">
                BellyTalk
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {profile?.full_name || user.email}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary border border-primary/20 dark:border-secondary/20">
                    {profile?.role}
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
                {canSeeNotifications && (
                  <Link
                    to="/notifications"
                    className="relative p-2 cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notificationUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {notificationUnreadCount > 99
                          ? "99+"
                          : notificationUnreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  className="p-2 cursor-pointer rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all"
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
                <Link
                  to="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-secondary px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
