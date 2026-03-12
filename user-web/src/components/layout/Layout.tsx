import React, { useState } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import { useShopStore } from "../../stores/shop.store";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const cartItems = useShopStore((state) => state.cartItems);
  const fetchCart = useShopStore((state) => state.fetchCart);

  const isDoctorUnderOnboarding =
    profile?.role === "doctor" && profile?.role_status !== "approved";
  const hideAppChrome =
    isDoctorUnderOnboarding ||
    location.pathname === "/doctor/complete-profile" ||
    location.pathname === "/doctor/pending-approval";

  useEffect(() => {
    if (!user || profile?.role !== "mother") {
      return;
    }

    fetchCart();
  }, [user, profile?.role, fetchCart]);

  const showFloatingCart =
    user &&
    profile?.role === "mother" &&
    cartItems.length > 0 &&
    location.pathname !== "/cart";

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

          {showFloatingCart && (
            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02] hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90"
            >
              <span className="relative inline-flex items-center">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartItems.length > 99 ? "99+" : cartItems.length}
                </span>
              </span>
              Go to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
