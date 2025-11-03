// src/services/video.service.ts
import api from './api';

class VideoService {
  /**
   * Create a new video session
   */
  async createSession(receiverId: string, channelName?: string) {
    console.log('🎯 Creating video session:', { receiverId, channelName });
    
    const response = await api.post('/audio/create', {
      receiver_id: receiverId,
      channel_name: channelName,
      call_type: 'video' // Specify this is a video call
    });
    
    console.log('✅ Video session created:', response.data);
    return response.data;
  }

  /**
   * Get auth tokens for joining video channel
   */
  async getTokens(sessionId?: string, channelName?: string, role: string = 'publisher', userName?: string) {
    console.log('🎯 Getting video auth tokens:', { sessionId, channelName, role });
    
    const response = await api.post('/audio/token', {
      session_id: sessionId,
      channel_name: channelName,
      role,
      user_name: userName
    });
    
    console.log('✅ Video auth tokens received:', {
      hasRtcToken: !!response.data.rtcToken,
      hasRtmToken: !!response.data.rtmToken,
      channelName: response.data.channelName,
      uid: response.data.uid
    });
    
    return response.data;
  }

  /**
   * End video session
   */
  async endSession(sessionId: string, recordingUrl?: string) {
    console.log('🎯 Ending video session:', { sessionId, recordingUrl });
    
    const response = await api.post(`/audio/end/${sessionId}`, {
      recording_url: recordingUrl
    });
    
    console.log('✅ Video session ended:', response.data);
    return response.data;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string) {
    console.log('🎯 Getting video session details:', { sessionId });
    
    const response = await api.get(`/audio/session/${sessionId}`);
    
    console.log('✅ Video session details received:', response.data);
    return response.data;
  }
}

export const videoService = new VideoService();