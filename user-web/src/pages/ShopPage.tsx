import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopService } from '../services/shop.service';
import { Product } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';

const ShopPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [cartItems, setCartItems] = useState<{[key: string]: number}>({});
  const [updatingCart, setUpdatingCart] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    if (user) {
      loadCart();
    }
  }, [searchQuery, category, user]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await shopService.getProducts({
        q: searchQuery,
        category: category || undefined
      });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const response = await shopService.getCart();
      const items: {[key: string]: number} = {};
      response.items?.forEach((item: any) => {
        items[item.product_id] = item.quantity;
      });
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      setUpdatingCart(productId);
      const currentQuantity = cartItems[productId] || 0;
      const diff = newQuantity - currentQuantity;

      if (diff > 0) {
        await shopService.addToCart(productId, diff);
      }

      setCartItems(prev => ({
        ...prev,
        [productId]: newQuantity
      }));
    } catch (error) {
      console.error('Failed to update cart:', error);
    } finally {
      setUpdatingCart(null);
    }
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 99) {
      updateCartQuantity(productId, num);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shop</h1>
        {user && (
          <Link
            to="/cart"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            View Cart
          </Link>
        )}
      </div>

      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Categories</option>
          <option value="Nutrition">Nutrition</option>
          <option value="Baby">Baby</option>
          <option value="Health">Health</option>
          <option value="Supplements">Supplements</option>
        </select>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {product.title}
                </h3>
                {product.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                 {product.category && (
                  <p className="px-2 py-1 my-3 w-fit text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary border border-primary/20 dark:border-secondary/20">
                    {product.category}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    ${product.price.toFixed(2)}
                  </span>
                  {user && (
                    cartItems[product.id] > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(product.id, cartItems[product.id] - 1)}
                          disabled={updatingCart === product.id}
                          className="bg-gray-200 cursor-pointer dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white w-8 h-8 rounded-lg text-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={cartItems[product.id]}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          disabled={updatingCart === product.id}
                          className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-1 disabled:opacity-50"
                        />
                        <button
                          onClick={() => updateCartQuantity(product.id, cartItems[product.id] + 1)}
                          disabled={updatingCart === product.id}
                          className="bg-primary cursor-pointer hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white w-8 h-8 rounded-lg text-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateCartQuantity(product.id, 1)}
                        disabled={updatingCart === product.id}
                        className="bg-primary cursor-pointer hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
                      >
                        {updatingCart === product.id ? 'Adding...' : 'Add to Cart'}
                      </button>
                    )
                  )}
                </div>
                {product.stock !== undefined && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </Layout>
  );
};

export default ShopPage;
