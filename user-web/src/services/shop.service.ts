import api from './api';

export const shopService = {
  async getProducts(params?: { q?: string; category?: string; page?: number; limit?: number }) {
    const response = await api.get('/shop/products', { params });
    return response.data;
  },

  async getProduct(id: string) {
    const response = await api.get(`/shop/products/${id}`);
    return response.data;
  },

  async getMyProducts() {
    const response = await api.get('/shop/my-products');
    return response.data;
  },

  async createProduct(data: FormData) {
    const response = await api.post('/shop/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateProduct(id: string, data: FormData) {
    const response = await api.put(`/shop/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteProduct(id: string) {
    const response = await api.delete(`/shop/products/${id}`);
    return response.data;
  },

  async getCart() {
    const response = await api.get('/shop/cart');
    return response.data;
  },

  async addToCart(productId: string, quantity: number) {
    const response = await api.post('/shop/cart/items', { productId, quantity });
    return response.data;
  },

  async removeFromCart(itemId: string) {
    const response = await api.delete(`/shop/cart/items/${itemId}`);
    return response.data;
  },

  async createOrder(data: {
    items?: { product_id: string; quantity: number; price: number }[];
    shipping_address?: any;
    notes?: string;
  }) {
    const response = await api.post('/shop/orders', data);
    return response.data;
  },

  async getOrders() {
    const response = await api.get('/shop/orders');
    return response.data;
  },

  async getOrder(id: string) {
    const response = await api.get(`/shop/orders/${id}`);
    return response.data;
  },

  async updateOrderStatus(id: string, data: {
    status?: string;
    tracking_number?: string;
    notes?: string;
  }) {
    const response = await api.patch(`/shop/orders/${id}/status`, data);
    return response.data;
  },
};
