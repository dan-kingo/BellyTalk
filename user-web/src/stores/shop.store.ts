import { create } from "zustand";
import { shopService } from "../services/shop.service";
import { Cart, CartItem, CreateOrderData, Order, Product } from "../types";

type OrdersScope = "all" | "my";
type ProductQuery = {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
};

type ShopStore = {
  products: Product[];
  productsLoading: boolean;
  myProducts: Product[];
  myProductsLoading: boolean;
  cart: Cart | null;
  cartItems: CartItem[];
  orders: Order[];
  myOrders: Order[];
  cartLoading: boolean;
  ordersLoading: boolean;
  checkoutLoading: boolean;
  error: string | null;
  currentProductsKey: string;
  lastProductsFetched: Record<string, number | null>;
  productRequests: Record<string, Promise<void> | null>;
  lastMyProductsFetched: number | null;
  myProductsRequest: Promise<void> | null;
  lastCartFetched: number | null;
  lastOrdersFetched: Record<OrdersScope, number | null>;
  cartRequest: Promise<void> | null;
  orderRequests: Record<OrdersScope, Promise<void> | null>;
  fetchProducts: (params?: ProductQuery, force?: boolean) => Promise<void>;
  fetchMyProducts: (force?: boolean) => Promise<void>;
  createMyProduct: (data: FormData) => Promise<void>;
  updateMyProduct: (id: string, data: FormData) => Promise<void>;
  deleteMyProduct: (id: string) => Promise<void>;
  fetchCart: (force?: boolean) => Promise<void>;
  fetchOrders: (scope?: OrdersScope, force?: boolean) => Promise<void>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateCartItemQuantity: (
    productId: string,
    quantity: number,
  ) => Promise<void>;
  createOrder: (orderData: CreateOrderData) => Promise<Order>;
  processPayment: (
    orderId: string,
    paymentMethod?: string,
  ) => Promise<{
    success: boolean;
    order: Order;
    message: string;
  }>;
  updateOrderStatus: (
    orderId: string,
    updates: {
      order_status?: string;
      tracking_number?: string;
      notes?: string;
    },
  ) => Promise<{ order: Order; message: string }>;
  cancelOrder: (
    orderId: string,
    reason?: string,
  ) => Promise<{ order: Order; message: string }>;
  clearError: () => void;
};

const CART_STALE_TIME_MS = 20_000;
const ORDERS_STALE_TIME_MS = 45_000;
const PRODUCTS_STALE_TIME_MS = 60_000;
const MY_PRODUCTS_STALE_TIME_MS = 60_000;

const getProductsKey = (params?: ProductQuery) => {
  const q = params?.q?.trim() || "";
  const category = params?.category?.trim() || "";
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  return `${q}|${category}|${page}|${limit}`;
};

const upsertOrder = (orders: Order[], updatedOrder: Order) => {
  const index = orders.findIndex((order) => order.id === updatedOrder.id);
  if (index === -1) {
    return [updatedOrder, ...orders];
  }

  const next = [...orders];
  next[index] = { ...next[index], ...updatedOrder };
  return next;
};

export const useShopStore = create<ShopStore>((set, get) => ({
  products: [],
  productsLoading: false,
  myProducts: [],
  myProductsLoading: false,
  cart: null,
  cartItems: [],
  orders: [],
  myOrders: [],
  cartLoading: false,
  ordersLoading: false,
  checkoutLoading: false,
  error: null,
  currentProductsKey: "|",
  lastProductsFetched: {},
  productRequests: {},
  lastMyProductsFetched: null,
  myProductsRequest: null,
  lastCartFetched: null,
  lastOrdersFetched: { all: null, my: null },
  cartRequest: null,
  orderRequests: { all: null, my: null },

  fetchProducts: async (params, force = false) => {
    const state = get();
    const key = getProductsKey(params);
    const inFlight = state.productRequests[key];

    if (inFlight) {
      return inFlight;
    }

    const lastFetched = state.lastProductsFetched[key] ?? null;
    const hasCachedProducts =
      state.currentProductsKey === key && state.products.length > 0;
    const isFresh =
      lastFetched !== null && Date.now() - lastFetched < PRODUCTS_STALE_TIME_MS;

    if (!force && hasCachedProducts && isFresh) {
      return;
    }

    const request = (async () => {
      set({ productsLoading: true, error: null });
      try {
        const response = await shopService.getProducts({
          q: params?.q || undefined,
          category: params?.category || undefined,
          page: params?.page,
          limit: params?.limit,
        });
        set((current) => ({
          products: response.products || [],
          productsLoading: false,
          currentProductsKey: key,
          lastProductsFetched: {
            ...current.lastProductsFetched,
            [key]: Date.now(),
          },
        }));
      } catch (error) {
        console.error("Failed to load products:", error);
        set({ productsLoading: false, error: "Failed to load products" });
        throw error;
      } finally {
        set((current) => ({
          productRequests: {
            ...current.productRequests,
            [key]: null,
          },
        }));
      }
    })();

    set((current) => ({
      productRequests: {
        ...current.productRequests,
        [key]: request,
      },
    }));

    return request;
  },

  fetchMyProducts: async (force = false) => {
    const state = get();

    if (state.myProductsRequest) {
      return state.myProductsRequest;
    }

    const isFresh =
      state.lastMyProductsFetched !== null &&
      Date.now() - state.lastMyProductsFetched < MY_PRODUCTS_STALE_TIME_MS;

    if (!force && isFresh && state.myProducts.length > 0) {
      return;
    }

    const request = (async () => {
      set({ myProductsLoading: true, error: null });
      try {
        const response = await shopService.getMyProducts();
        set({
          myProducts: response.products || [],
          myProductsLoading: false,
          lastMyProductsFetched: Date.now(),
        });
      } catch (error) {
        console.error("Failed to load my products:", error);
        set({ myProductsLoading: false, error: "Failed to load products" });
        throw error;
      } finally {
        set({ myProductsRequest: null });
      }
    })();

    set({ myProductsRequest: request });
    return request;
  },

  createMyProduct: async (data) => {
    set({ error: null });
    try {
      await shopService.createProduct(data);
      await get().fetchMyProducts(true);
    } catch (error) {
      console.error("Failed to create product:", error);
      set({ error: "Failed to create product" });
      throw error;
    }
  },

  updateMyProduct: async (id, data) => {
    set({ error: null });
    try {
      await shopService.updateProduct(id, data);
      await get().fetchMyProducts(true);
    } catch (error) {
      console.error("Failed to update product:", error);
      set({ error: "Failed to update product" });
      throw error;
    }
  },

  deleteMyProduct: async (id) => {
    set({ error: null });
    try {
      await shopService.deleteProduct(id);
      set((state) => ({
        myProducts: state.myProducts.filter((product) => product.id !== id),
        lastMyProductsFetched: Date.now(),
      }));
    } catch (error) {
      console.error("Failed to delete product:", error);
      set({ error: "Failed to delete product" });
      throw error;
    }
  },

  fetchCart: async (force = false) => {
    const state = get();

    if (state.cartRequest) {
      return state.cartRequest;
    }

    const isFresh =
      state.lastCartFetched !== null &&
      Date.now() - state.lastCartFetched < CART_STALE_TIME_MS;

    if (!force && isFresh) {
      return;
    }

    const request = (async () => {
      set({ cartLoading: true, error: null });
      try {
        const response = await shopService.getCart();
        set({
          cart: response.cart ?? null,
          cartItems: response.items ?? [],
          cartLoading: false,
          lastCartFetched: Date.now(),
        });
      } catch (error) {
        console.error("Failed to load cart:", error);
        set({ cartLoading: false, error: "Failed to load cart" });
        throw error;
      } finally {
        set({ cartRequest: null });
      }
    })();

    set({ cartRequest: request });
    return request;
  },

  fetchOrders: async (scope: OrdersScope = "all", force = false) => {
    const state = get();

    if (state.orderRequests[scope]) {
      return state.orderRequests[scope] as Promise<void>;
    }

    const lastFetched = state.lastOrdersFetched[scope];
    const isFresh =
      lastFetched !== null && Date.now() - lastFetched < ORDERS_STALE_TIME_MS;

    if (!force && isFresh) {
      return;
    }

    const request = (async () => {
      set({ ordersLoading: true, error: null });
      try {
        const response =
          scope === "my"
            ? await shopService.getMyOrders()
            : await shopService.getOrders();
        set((current) => ({
          orders: scope === "all" ? (response.orders ?? []) : current.orders,
          myOrders: scope === "my" ? (response.orders ?? []) : current.myOrders,
          ordersLoading: false,
          lastOrdersFetched: {
            ...current.lastOrdersFetched,
            [scope]: Date.now(),
          },
        }));
      } catch (error) {
        console.error("Failed to load orders:", error);
        set({ ordersLoading: false, error: "Failed to load orders" });
        throw error;
      } finally {
        set((current) => ({
          orderRequests: {
            ...current.orderRequests,
            [scope]: null,
          },
        }));
      }
    })();

    set((current) => ({
      orderRequests: {
        ...current.orderRequests,
        [scope]: request,
      },
    }));

    return request;
  },

  addToCart: async (productId: string, quantity: number) => {
    if (quantity <= 0) return;

    set({ error: null });
    try {
      await shopService.addToCart(productId, quantity);
      await get().fetchCart(true);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      set({ error: "Failed to add item to cart" });
      throw error;
    }
  },

  removeFromCart: async (itemId: string) => {
    set({ error: null });
    try {
      await shopService.removeFromCart(itemId);
      set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== itemId),
        lastCartFetched: Date.now(),
      }));
    } catch (error) {
      console.error("Failed to remove cart item:", error);
      set({ error: "Failed to remove item from cart" });
      throw error;
    }
  },

  updateCartItemQuantity: async (productId: string, quantity: number) => {
    const normalizedQuantity = Math.max(0, quantity);
    const { cartItems } = get();
    const existing = cartItems.find((item) => item.product_id === productId);

    set({ error: null });

    try {
      if (!existing && normalizedQuantity > 0) {
        await shopService.addToCart(productId, normalizedQuantity);
      } else if (existing && normalizedQuantity === 0) {
        await shopService.removeFromCart(existing.id);
      } else if (existing && normalizedQuantity > existing.quantity) {
        await shopService.addToCart(
          productId,
          normalizedQuantity - existing.quantity,
        );
      } else if (existing && normalizedQuantity < existing.quantity) {
        // Backend does not expose quantity decrement, so rebuild this item with desired quantity.
        await shopService.removeFromCart(existing.id);
        if (normalizedQuantity > 0) {
          await shopService.addToCart(productId, normalizedQuantity);
        }
      }

      await get().fetchCart(true);
    } catch (error) {
      console.error("Failed to update cart quantity:", error);
      set({ error: "Failed to update cart quantity" });
      throw error;
    }
  },

  createOrder: async (orderData: CreateOrderData) => {
    set({ checkoutLoading: true, error: null });
    try {
      const response = await shopService.createOrder(orderData);
      const order = response.order;

      set((state) => ({
        checkoutLoading: false,
        myOrders: upsertOrder(state.myOrders, order),
        orders: upsertOrder(state.orders, order),
        cart: null,
        cartItems: [],
        lastCartFetched: Date.now(),
      }));

      return order;
    } catch (error) {
      console.error("Failed to create order:", error);
      set({ checkoutLoading: false, error: "Failed to create order" });
      throw error;
    }
  },

  processPayment: async (orderId: string, paymentMethod?: string) => {
    set({ checkoutLoading: true, error: null });
    try {
      const response = await shopService.processPayment(orderId, paymentMethod);
      const updated = response.order;

      set((state) => ({
        checkoutLoading: false,
        myOrders: upsertOrder(state.myOrders, updated),
        orders: upsertOrder(state.orders, updated),
      }));

      return response;
    } catch (error) {
      console.error("Failed to process payment:", error);
      set({ checkoutLoading: false, error: "Failed to process payment" });
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, updates) => {
    set({ error: null });
    try {
      const response = await shopService.updateOrderStatus(orderId, updates);
      const updatedOrder = response.order;

      set((state) => ({
        orders: upsertOrder(state.orders, updatedOrder),
        myOrders: upsertOrder(state.myOrders, updatedOrder),
      }));

      return response;
    } catch (error) {
      console.error("Failed to update order:", error);
      set({ error: "Failed to update order" });
      throw error;
    }
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    set({ error: null });
    try {
      const response = await shopService.cancelOrder(orderId, reason);
      const updatedOrder = response.order;

      set((state) => ({
        orders: upsertOrder(state.orders, updatedOrder),
        myOrders: upsertOrder(state.myOrders, updatedOrder),
      }));

      return response;
    } catch (error) {
      console.error("Failed to cancel order:", error);
      set({ error: "Failed to cancel order" });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Backward-compatibility shim for existing imports.
export const useOrdersStore = useShopStore;
