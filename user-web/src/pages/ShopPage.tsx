import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import { useShopStore } from "../stores/shop.store";
import { Maximize2, X } from "lucide-react";
import { Product } from "../types";
import Skeleton from "../components/common/Skeleton";
import { getRenderableImageUrl } from "../utils/image";

const PAGE_SIZE = 9;

const ShopPage: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [updatingCart, setUpdatingCart] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const products = useShopStore((state) => state.products);
  const loading = useShopStore((state) => state.productsLoading);
  const fetchProducts = useShopStore((state) => state.fetchProducts);
  const cartItems = useShopStore((state) => state.cartItems);
  const fetchCart = useShopStore((state) => state.fetchCart);
  const updateCartItemQuantity = useShopStore(
    (state) => state.updateCartItemQuantity,
  );

  const cartQuantityMap = cartItems.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.product_id] = item.quantity;
      return acc;
    },
    {},
  );

  useEffect(() => {
    fetchProducts({
      q: searchQuery,
      category: category || undefined,
      page: 1,
      limit,
    });

    if (user) {
      fetchCart();
    }
  }, [searchQuery, category, limit, user, fetchProducts, fetchCart]);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedProduct]);

  const updateCartQuantity = async (productId: string, newQuantity: number) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      setUpdatingCart(productId);
      await updateCartItemQuantity(productId, newQuantity);
    } catch (error) {
      console.error("Failed to update cart:", error);
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

  const handleLoadMore = () => {
    setLimit((prev) => prev + PAGE_SIZE);
  };

  if (loading && products.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
              >
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4 mt-4" />
                <Skeleton className="h-4 w-full mt-3" />
                <Skeleton className="h-4 w-2/3 mt-2" />
                <div className="flex justify-between items-center mt-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shop
          </h1>
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(PAGE_SIZE);
            }}
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
            <p className="text-gray-600 dark:text-gray-400">
              No products found
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="absolute top-3 right-3 z-10 rounded-full bg-white/90 dark:bg-gray-900/85 p-2 cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition"
                    aria-label={`View details for ${product.title}`}
                    title="View details"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {product.image_url && (
                    <img
                      src={getRenderableImageUrl(product.image_url)}
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

                      {user &&
                        (cartQuantityMap[product.id] > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  product.id,
                                  cartQuantityMap[product.id] - 1,
                                )
                              }
                              disabled={updatingCart === product.id}
                              className="bg-gray-200 cursor-pointer dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white w-8 h-8 rounded-lg text-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              pattern="[0-9]*"
                              inputMode="numeric"
                              value={cartQuantityMap[product.id]}
                              onChange={(e) =>
                                handleQuantityChange(product.id, e.target.value)
                              }
                              disabled={updatingCart === product.id}
                              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-1 disabled:opacity-50"
                            />
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  product.id,
                                  cartQuantityMap[product.id] + 1,
                                )
                              }
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
                            {updatingCart === product.id
                              ? "Adding..."
                              : "Add to Cart"}
                          </button>
                        ))}
                    </div>

                    {product.stock !== undefined && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : "Out of stock"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {products.length >= limit && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg cursor-pointer bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5">
            <div
              className="absolute inset-0"
              onClick={() => setSelectedProduct(null)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-6xl h-[94vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="h-full overflow-y-auto scrollbar-hide">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-4">
                    {selectedProduct.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="rounded-full p-2 cursor-pointer text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                    aria-label="Close product details"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6">
                  <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-h-[280px] sm:min-h-[420px]">
                    {selectedProduct.image_url ? (
                      <img
                        src={getRenderableImageUrl(selectedProduct.image_url)}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        No image available
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400">
                        ${selectedProduct.price.toFixed(2)}
                      </span>
                      {selectedProduct.stock !== undefined && (
                        <span
                          className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
                            selectedProduct.stock > 0
                              ? "bg-green-100 dark:bg-green-900/25 text-green-700 dark:text-green-300"
                              : "bg-red-100 dark:bg-red-900/25 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {selectedProduct.stock > 0
                            ? `${selectedProduct.stock} in stock`
                            : "Out of stock"}
                        </span>
                      )}
                    </div>

                    {selectedProduct.category && (
                      <p className="px-3 py-1 w-fit text-sm font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary border border-primary/20 dark:border-secondary/20">
                        {selectedProduct.category}
                      </p>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Description
                      </h3>
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {selectedProduct.description ||
                          "No description available for this product yet."}
                      </p>
                    </div>

                    {user && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                          Quick Add
                        </h3>
                        {cartQuantityMap[selectedProduct.id] > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  selectedProduct.id,
                                  cartQuantityMap[selectedProduct.id] - 1,
                                )
                              }
                              disabled={updatingCart === selectedProduct.id}
                              className="bg-gray-200 cursor-pointer dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white w-10 h-10 rounded-lg text-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              pattern="[0-9]*"
                              inputMode="numeric"
                              value={cartQuantityMap[selectedProduct.id]}
                              onChange={(e) =>
                                handleQuantityChange(
                                  selectedProduct.id,
                                  e.target.value,
                                )
                              }
                              disabled={updatingCart === selectedProduct.id}
                              className="w-14 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2 disabled:opacity-50"
                            />
                            <button
                              onClick={() =>
                                updateCartQuantity(
                                  selectedProduct.id,
                                  cartQuantityMap[selectedProduct.id] + 1,
                                )
                              }
                              disabled={updatingCart === selectedProduct.id}
                              className="bg-primary cursor-pointer hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white w-10 h-10 rounded-lg text-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              updateCartQuantity(selectedProduct.id, 1)
                            }
                            disabled={updatingCart === selectedProduct.id}
                            className="bg-primary cursor-pointer hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            {updatingCart === selectedProduct.id
                              ? "Adding..."
                              : "Add to Cart"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ShopPage;
