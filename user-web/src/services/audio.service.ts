import api from './api';

class AudioService {
  /**
   * Create a new audio session
   */
  async createSession(receiverId: string, channelName?: string) {
    console.log('🎯 Creating audio session:', { receiverId, channelName });
    
    const response = await api.post('/audio/create', {
      receiver_id: receiverId,
      channel_name: channelName
    });
    
    console.log('✅ Audio session created:', response.data);
    return response.data;
  }

  /**
   * Get auth tokens for joining channel
   */
  async getTokens(sessionId?: string, channelName?: string, role: string = 'publisher', userName?: string) {
    console.log('🎯 Getting auth tokens:', { sessionId, channelName, role });
    
    const response = await api.post('/audio/token', {
      session_id: sessionId,
      channel_name: channelName,
      role,
      user_name: userName
    });
    
    console.log('✅ Auth tokens received:', {
      hasRtcToken: !!response.data.rtcToken,
      hasRtmToken: !!response.data.rtmToken,
      channelName: response.data.channelName,
      uid: response.data.uid
    });
    
    return response.data;
  }

  /**
   * End audio session
   */
  async endSession(sessionId: string, recordingUrl?: string, summary?: string) {
    console.log('🎯 Ending audio session:', { sessionId, recordingUrl, summary });
    
    const response = await api.post(`/audio/end/${sessionId}`, {
      recording_url: recordingUrl,
      summary
    });
    
    console.log('✅ Audio session ended:', response.data);
    return response.data;
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string) {
    console.log('🎯 Getting session details:', { sessionId });
    
    const response = await api.get(`/audio/session/${sessionId}`);
    
    console.log('✅ Session details received:', response.data);
    return response.data;
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelName: string) {
    console.log('🎯 Getting channel info:', { channelName });
    
    const response = await api.get(`/audio/channel-info/${channelName}`);
    
    console.log('✅ Channel info received:', response.data);
    return response.data;
  }
}

export const audioService = new AudioService();