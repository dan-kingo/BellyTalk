import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, FileText, User, X, ShoppingCart, MessageSquare, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { shopService } from '../../services/shop.service';
import { chatService } from '../../services/chat.service';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { profile, user } = useAuth();
  const [showTitle, setShowTitle] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['mother', 'doctor', 'counselor', 'admin'] },
    { path: '/content', icon: FileText, label: 'Content', roles: ['mother', 'doctor', 'counselor', 'admin'] },
    { path: '/hospitals', icon: Building2, label: 'Hospitals', roles: ['mother', 'doctor', 'counselor', 'admin'] },
    { path: '/shop', icon: ShoppingBag, label: 'Shop', roles: ['mother'] },
    { path: '/cart', icon: ShoppingCart, label: 'Cart', roles: ['mother'] },
    { path: '/orders', icon: ShoppingCart, label: 'Orders', roles: ['mother'] },
    { path: '/manage/products', icon: ShoppingBag, label: 'Manage Products', roles: ['admin', 'doctor', 'counselor'] },
    { path: '/manage/orders', icon: ShoppingCart, label: 'Manage Orders', roles: ['admin', 'doctor', 'counselor'] },
    { path: '/chat', icon: MessageSquare, label: 'Messages', roles: ['mother', 'doctor', 'counselor'] },
    { path: '/profile', icon: User, label: 'Profile', roles: ['mother', 'doctor', 'counselor', 'admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    !profile || item.roles.includes(profile.role)
  );

  useEffect(() => {
    const handleScroll = () => {
      setShowTitle(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user && profile?.role === 'mother') {
      loadCounts();
      const interval = setInterval(loadCounts, 3000);
      return () => clearInterval(interval);
    }
  }, [user, profile]);

  const loadCounts = async () => {
    try {
      const [cartRes, ordersRes, unreadRes] = await Promise.all([
        shopService.getCart().catch(() => ({ items: [] })),
        shopService.getOrders().catch(() => ({ orders: [] })),
        chatService.getUnreadCount().catch(() => ({ unread_count: 0 }))
      ]);

      setCartCount(cartRes.items?.length || 0);
      setOrderCount(ordersRes.orders?.filter(order => order.order_status === 'pending').length || 0);
      setMessageCount(unreadRes.unread_count || 0);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

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
        <div className="h-full px-4 py-1 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-64">
          <div className="flex items-center justify-between  px-2">
            {/* 🔹 Title fades in after scroll > 40px */}
            <h2
              className={`text-2xl ml-3 font-bold text-primary dark:text-secondary transition-opacity duration-500 ${
                showTitle ? 'opacity-100 m-4' : 'opacity-0'
              }`}
            >
              BellyTalk
            </h2>

            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="space-y-2">
            {filteredMenuItems.map((item) => {
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
                  {item.path === '/cart' && cartCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                  {item.path === '/orders' && orderCount > 0 && (
                    <span className="ml-auto bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {orderCount}
                    </span>
                  )}
                  {item.path === '/chat' && messageCount > 0 && (
                    <span className="ml-auto bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {messageCount}
                    </span>
                  )}
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
