import api from './api';
import { supabase } from './supabase';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { session } = response.data;

    if (session?.access_token) {
      localStorage.setItem('admin_access_token', session.access_token);
      localStorage.setItem('admin_refresh_token', session.refresh_token);
    }

    return response.data;
  },

  async logout() {
    await api.post('/auth/logout').catch(() => {});
    await supabase.auth.signOut();
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
  },

  async getProfile() {
    const response = await api.get('/profile/me');
    return response.data.profile;
  },

  isAuthenticated() {
    return !!localStorage.getItem('admin_access_token');
  },
};
