import api from './api';

class AudioService {
  /**
   * Create a new audio session
   */
  async createSession(receiverId: string, templateId?: string, region?: string) {
    const response = await api.post('/audio/create', {
      receiver_id: receiverId,
      template_id: templateId,
      region: region
    });
    return response.data;
  }

  /**
   * Get auth token for joining room
   */
  async getToken(sessionId?: string, roomId?: string, role: string = 'guest', userName?: string) {
    const response = await api.post('/audio/token', {
      session_id: sessionId,
      room_id: roomId,
      role,
      user_name: userName
    });
    return response.data;
  }

  /**
   * End audio session
   */
  async endSession(sessionId: string, recordingUrl?: string, summary?: string) {
    const response = await api.post(`/audio/end/${sessionId}`, {
      recording_url: recordingUrl,
      summary
    });
    return response.data;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string) {
    const response = await api.get(`/audio/session/${sessionId}`);
    return response.data;
  }
}

export const audioService = new AudioService();