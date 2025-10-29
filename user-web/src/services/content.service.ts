import api from './api';

export interface EducationalContent {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category?: string;
  tags?: string[];
  language: string;
  cover_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentFilters {
  query?: string;
  lang?: string;
  page?: number;
  limit?: number;
}

export const contentService = {
  async getAllContent(filters: ContentFilters = {}) {
    const params = new URLSearchParams();
    if (filters.query) params.append('query', filters.query);
    if (filters.lang) params.append('lang', filters.lang);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/content?${params.toString()}`);
    return response.data;
  },

  async getContent(id: string, lang?: string) {
    const params = lang ? `?lang=${lang}` : '';
    const response = await api.get(`/content/${id}${params}`);
    return response.data;
  },

  async createContent(contentData: Partial<EducationalContent>) {
    const response = await api.post('/content', contentData);
    return response.data;
  },

  async updateContent(id: string, contentData: Partial<EducationalContent>) {
    const response = await api.put(`/content/${id}`, contentData);
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
