import api from './api';

export const profileService = {
  async getMe() {
    const response = await api.get('/profile/me');
    return response.data;
  },

  async updateMe(data: FormData) {
    const response = await api.put('/profile/me', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async requestRoleUpgrade(role: string, files: File[]) {
  
  const formData = new FormData();
  formData.append('role', role);
  
  files.forEach((file) => {
    formData.append('files', file);
  });

 
  try {
    const response = await api.post('/profile/request-role-upgrade', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('API error details:', error.response?.data);
    throw error;
  }
}};
