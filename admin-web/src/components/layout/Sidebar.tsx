import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, X, Building2, RollerCoasterIcon } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/contents', icon: FileText, label: 'Contents' },
    { path: '/hospitals', icon: Building2, label: 'Hospitals' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/role-requests', icon: RollerCoasterIcon, label: 'Role Requests' },
    // { path: '/activity-logs', icon: Activity, label: 'Activity Logs' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full px-4 py-6 overflow-y-auto scrollbar-hide bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-64">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-xl font-bold text-primary dark:text-secondary">Admin Panel</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white dark:bg-secondary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
