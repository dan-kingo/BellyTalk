import api from './api';
import { Hospital } from '../types';

export const hospitalService = {
  async getHospitals(params?: { city?: string; service?: string; query?: string; page?: number; limit?: number }) {
    const response = await api.get('/hospitals', { params });
    return response.data;
  },

  async getMyHospitals(params?: {limit?: number}) {
    const response = await api.get('/hospitals/my-hospitals', { params });
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
