import api from './api';

export const adminService = {
  async getOverview() {
    const response = await api.get('/admin/panel/overview');
    return response.data;
  },

  async listUsers() {
    const response = await api.get('/admin/panel/users');
    return response.data;
  },

  async deleteUser(userId: string) {
    const response = await api.delete(`/admin/panel/users/${userId}`);
    return response.data;
  },

  async getLogs() {
    const response = await api.get('/admin/panel/logs');
    return response.data;
  },

  async listRoleRequests() {
    const response = await api.get('/admin/roles/pending');
    return response.data;
  },

  async approveRole(userId: string) {
    const response = await api.post(`/admin/roles/${userId}/approve`);
    return response.data;
  },

  async rejectRole(userId: string, reason: string) {
    const response = await api.post(`/admin/roles/${userId}/reject`, { reason });
    return response.data;
  },
};
