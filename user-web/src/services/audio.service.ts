import api from './api';

export const audioService = {
  async createSession(receiverId: string, templateId?: string, region?: string) {
    const response = await api.post('/audio/create', { receiver_id: receiverId, template_id: templateId, region });
    return response.data;
  },

  async getToken(sessionId?: string, roomId?: string, role?: string, userName?: string) {
    const response = await api.post('/audio/token', { session_id: sessionId, room_id: roomId, role, user_name: userName });
    return response.data;
  },

  async endSession(sessionId: string, recordingUrl?: string, summary?: string) {
    const response = await api.post(`/audio/end/${sessionId}`, { recording_url: recordingUrl, summary });
    return response.data;
  },
};
