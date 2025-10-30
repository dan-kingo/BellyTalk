import api from './api';
import { UserRole } from '../types';
import { supabase } from './supabase';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { session } = response.data;

    if (session?.access_token) {
      localStorage.setItem('access_token', session.access_token);
      localStorage.setItem('refresh_token', session.refresh_token);
    }

    return response.data;
  },

  async register(email: string, password: string, full_name: string, role: UserRole) {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name,
      role,
      language: 'en',
    });
    return response.data;
  },

  async logout() {
  await api.post('/auth/logout').catch(() => {}); // optional, ignore if backend handles it
  await supabase.auth.signOut(); // ✅ clear Supabase session
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
},


  async getProfile() {
    const response = await api.get('/profile/me');
    return response.data.profile;
  },

  async updateProfile(data: any) {
    const response = await api.put('/profile/me', data);
    return response.data.profile;
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};
