import api from './api';

export const videoService = {
  async createSession(receiverId: string, region?: string) {
    const response = await api.post('/video/sessions', { receiver_id: receiverId, region });
    return response.data;
  },

  async getToken(sessionId?: string, roomId?: string, role?: string, userName?: string) {
    const response = await api.post('/video/token', { session_id: sessionId, room_id: roomId, role, user_name: userName });
    return response.data;
  },

  async endSession(sessionId: string, summary?: string) {
    const response = await api.post(`/video/sessions/${sessionId}/end`, { summary });
    return response.data;
  },
};
