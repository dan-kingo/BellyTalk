import api from './api';

export const chatService = {
  async createConversation(participantId: string) {
    const response = await api.post('/chat/conversations', { participantId });
    return response.data;
  },

  async listConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  async sendMessage(data: FormData) {
    const response = await api.post('/chat/messages', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getMessages(conversationId: string, params?: { limit?: number; before?: string; after?: string }) {
    const response = await api.get(`/chat/messages/${conversationId}`, { params });
    return response.data;
  },

  async markMessagesSeen(conversationId: string) {
    const response = await api.put(`/chat/messages/${conversationId}/seen`);
    return response.data;
  },
};
