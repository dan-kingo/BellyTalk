import api from './api';

export interface Hospital {
  id: string;
  name: string;
  description?: string;
  city?: string;
  services?: string[];
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalFilters {
  city?: string;
  service?: string;
  query?: string;
  page?: number;
  limit?: number;
}

export const hospitalService = {
  async getHospitals(filters: HospitalFilters = {}) {
    const params = new URLSearchParams();
    if (filters.city) params.append('city', filters.city);
    if (filters.service) params.append('service', filters.service);
    if (filters.query) params.append('query', filters.query);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/hospitals?${params.toString()}`);
    return response.data;
  },

  async createHospital(hospitalData: Partial<Hospital>) {
    const response = await api.post('/hospitals', hospitalData);
    return response.data;
  },

  async updateHospital(id: string, hospitalData: Partial<Hospital>) {
    const response = await api.put(`/hospitals/${id}`, hospitalData);
    return response.data;
  },

  async deleteHospital(id: string) {
    const response = await api.delete(`/hospitals/${id}`);
    return response.data;
  },
};
