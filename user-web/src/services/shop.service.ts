import { CreateOrderData, Order } from '@/types';
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
 async createOrder(orderData: CreateOrderData): Promise<{ order: Order }> {
    const response = await api.post('/shop/orders', orderData);
    return response.data;
  },

  async processPayment(orderId: string, paymentMethod?: string): Promise<{
    success: boolean;
    order: Order;
    message: string;
  }> {
    const response = await api.post(`/shop/orders/${orderId}/payment`, {
      paymentMethod
    });
    return response.data;
  }
,
  async getOrders(): Promise<{ orders: Order[] }> {
    const response = await api.get('/shop/orders');
    return response.data;
  },
  async getMyOrders(): Promise<{ orders: Order[] }> {
    const response = await api.get('/shop/my-orders');
    return response.data;
  } ,

  async getOrder(orderId: string): Promise<{ order: Order }> {
    const response = await api.get(`/shop/orders/${orderId}`);
    return response.data;
  }
,
  async updateOrderStatus(orderId: string, updates: {
    order_status?: string;
    tracking_number?: string;
    notes?: string;
  }): Promise<{ order: Order; message: string }> {
    const response = await api.put(`/shop/orders/${orderId}/status`, updates);
    return response.data;
  }
,
  async cancelOrder(orderId: string, reason?: string): Promise<{ order: Order; message: string }> {
    const response = await api.post(`/shop/orders/${orderId}/cancel`, { reason });
    return response.data;
  }
};
