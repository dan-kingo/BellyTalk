import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useShopStore } from "../stores/shop.store";
import { toast } from "react-toastify";
import Skeleton from "../components/common/Skeleton";

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const items = useShopStore((state) => state.cartItems);
  const loading = useShopStore((state) => state.cartLoading);
  const fetchCart = useShopStore((state) => state.fetchCart);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      setRemoving(itemId);
      await removeFromCart(itemId);
      toast.success("Item removed from cart.");
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error("Failed to remove item from cart.");
    } finally {
      setRemoving(null);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const price = item.products?.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    navigate("/checkout", {
      state: { cartItems: items, total: calculateTotal() },
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-4"
                >
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shopping Cart
          </h1>
          <Link
            to="/shop"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your cart is empty
            </p>
            <Link
              to="/shop"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg inline-block transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-4"
                >
                  {item.products?.image_url && (
                    <img
                      src={item.products.image_url}
                      alt={item.products.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.products?.title || "Product"}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-2">
                      $
                      {((item.products?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removing === item.id}
                    className="text-red-600 cursor-pointer hover:text-red-700 disabled:opacity-50 px-4 py-2"
                  >
                    {removing === item.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Order Summary
                </h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full cursor-pointer bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CartPage;
