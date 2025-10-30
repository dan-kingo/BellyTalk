import api from './api';
import { Content } from '../types';

export const contentService = {
  async getAllContent(params?: { query?: string; lang?: string; page?: number; limit?: number }) {
    const response = await api.get('/content', { params });
    return response.data;
  },

  async getContent(id: string, lang?: string) {
    const response = await api.get(`/content/${id}`, { params: { lang } });
    return response.data;
  },

  async createContent(data: FormData) {
    const response = await api.post('/content', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateContent(id: string, data: Partial<Content>) {
    const response = await api.put(`/content/${id}`, data);
    return response.data;
  },

  async deleteContent(id: string) {
    const response = await api.delete(`/content/${id}`);
    return response.data;
  },

  async translateContent(id: string, targetLang: string) {
    const response = await api.post(`/content/${id}/translate`, { targetLang });
    return response.data;
  },
};
