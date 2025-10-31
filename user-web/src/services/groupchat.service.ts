import api from './api';

export const groupChatService = {
  async createGroup(name: string, description?: string) {
    const response = await api.post('/groupchats', { name, description });
    return response.data;
  },

  async listGroups() {
    const response = await api.get('/groupchats');
    return response.data;
  },

  async joinGroup(roomId: string) {
    const response = await api.post(`/groupchats/${roomId}/join`);
    return response.data;
  },

  async sendMessage(roomId: string, message: string, attachments?: any[]) {
    const response = await api.post(`/groupchats/${roomId}/messages`, {
      message,
      attachments,
    });
    return response.data;
  },

  async listMessages(roomId: string) {
    const response = await api.get(`/groupchats/${roomId}/messages`);
    return response.data;
  },
};
