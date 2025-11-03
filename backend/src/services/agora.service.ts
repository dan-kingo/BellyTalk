import { RtcTokenBuilder, RtmTokenBuilder } from 'agora-access-token';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';
const AGORA_RESTFUL_ID = process.env.AGORA_RESTFUL_ID || '';
const AGORA_RESTFUL_SECRET = process.env.AGORA_RESTFUL_SECRET || '';

console.log('Agora Config Check:', {
  appId: AGORA_APP_ID ? 'SET' : 'MISSING',
  certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'MISSING',
  restfulId: AGORA_RESTFUL_ID ? 'SET' : 'MISSING',
  restfulSecret: AGORA_RESTFUL_SECRET ? 'SET' : 'MISSING'
});

interface AgoraChannelInfo {
  channelName: string;
  uid: number;
  token: string;
  rtmToken?: string;
}

interface AgoraRecordingInfo {
  resourceId: string;
  sid: string;
}

// Use direct numeric values for roles to avoid TypeScript enum issues
const RTC_ROLE_PUBLISHER = 1;
const RTC_ROLE_SUBSCRIBER = 2;
const RTM_ROLE_USER = 1;

type AgoraRtcRole = 'publisher' | 'subscriber';

class AgoraService {
  /**
   * Generate a random UID for Agora channel
   */
  generateUid(): number {
    return Math.floor(Math.random() * 100000);
  }

  /**
   * Generate RTC token for voice call
   */
  generateRtcToken(
    channelName: string, 
    uid: number, 
    role: AgoraRtcRole = 'publisher'
  ): string {
    console.log('🔧 Generating RTC Token:', { channelName, uid, role });
    
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.warn('⚠️ Agora credentials not configured, using mock token');
      return `mock_rtc_token_${channelName}_${uid}_${Date.now()}`;
    }

    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Convert string role to numeric role
    let roleValue: number;
    switch (role) {
      case 'publisher':
        roleValue = RTC_ROLE_PUBLISHER;
        break;
      case 'subscriber':
        roleValue = RTC_ROLE_SUBSCRIBER;
        break;
      default:
        roleValue = RTC_ROLE_PUBLISHER;
    }

    try {
      const token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        roleValue, // Use numeric value directly
        privilegeExpiredTs
      );

      console.log('✅ RTC Token generated successfully');
      return token;
    } catch (error: any) {
      console.error('❌ RTC Token generation failed:', error);
      throw new Error(`Failed to generate RTC token: ${error.message}`);
    }
  }

  /**
   * Generate RTM token for signaling
   */
  generateRtmToken(uid: string): string {
    console.log('🔧 Generating RTM Token:', { uid });
    
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.warn('⚠️ Agora credentials not configured, using mock RTM token');
      return `mock_rtm_token_${uid}_${Date.now()}`;
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    try {
      const token = RtmTokenBuilder.buildToken(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        uid,
        RTM_ROLE_USER, // Use numeric value directly
        privilegeExpiredTs
      );

      console.log('✅ RTM Token generated successfully');
      return token;
    } catch (error: any) {
      console.error('❌ RTM Token generation failed:', error);
      throw new Error(`Failed to generate RTM token: ${error.message}`);
    }
  }

  /**
   * Create channel tokens for audio call
   */
  createChannelTokens(userId: string, channelName?: string): AgoraChannelInfo {
    console.log('🚀 Creating Agora channel tokens:', { userId, channelName });
    
    const generatedChannelName = channelName || `audio_${userId}_${Date.now()}`;
    const uid = this.generateUid();

    console.log('📋 Channel details:', {
      channelName: generatedChannelName,
      uid,
      userId
    });

    const rtcToken = this.generateRtcToken(generatedChannelName, uid);
    const rtmToken = this.generateRtmToken(userId.toString());

    const result = {
      channelName: generatedChannelName,
      uid,
      token: rtcToken,
      rtmToken
    };

    console.log('✅ Agora channel tokens created:', {
      channelName: result.channelName,
      uid: result.uid,
      tokenLength: result.token.length,
      hasRtmToken: !!result.rtmToken
    });

    return result;
  }

  /**
   * Validate if channel exists (Agora doesn't have explicit channel creation)
   */
  async validateChannel(channelName: string): Promise<boolean> {
    console.log('🔍 Validating Agora channel:', { channelName });
    
    // Agora channels are created on-the-fly when users join
    // We can't directly validate channel existence without joining
    // So we'll return true as channels are dynamically created
    return true;
  }

  /**
   * Get channel user count (requires Agora REST API)
   */
  async getChannelUserCount(channelName: string): Promise<number> {
    console.log('👥 Getting channel user count:', { channelName });
    
    if (!AGORA_RESTFUL_ID || !AGORA_RESTFUL_SECRET) {
      console.warn('⚠️ Agora REST credentials not configured, returning mock user count');
      return 0;
    }

    try {
      const credentials = Buffer.from(`${AGORA_RESTFUL_ID}:${AGORA_RESTFUL_SECRET}`).toString('base64');
      
      const response = await axios.get(
        `https://api.agora.io/dev/v1/channel/user/${AGORA_APP_ID}/${channelName}`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Channel user count retrieved:', response.data);
      return response.data.data.channel_exist ? response.data.data.total : 0;
    } catch (error: any) {
      console.error('❌ Failed to get channel user count:', {
        error: error.response?.data || error.message,
        channelName
      });
      return 0;
    }
  }

  /**
   * Start cloud recording (optional)
   */
  async startRecording(channelName: string, uid: string): Promise<AgoraRecordingInfo | null> {
    console.log('🎥 Starting cloud recording:', { channelName, uid });
    
    if (!AGORA_RESTFUL_ID || !AGORA_RESTFUL_SECRET) {
      console.warn('⚠️ Agora REST credentials not configured, recording disabled');
      return null;
    }

    try {
      const credentials = Buffer.from(`${AGORA_RESTFUL_ID}:${AGORA_RESTFUL_SECRET}`).toString('base64');
      const resourceId = await this.acquireRecordingResource(channelName, uid);
      
      if (!resourceId) {
        throw new Error('Failed to acquire recording resource');
      }

      const response = await axios.post(
        `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
        {
          cname: channelName,
          uid: uid,
          clientRequest: {}
        },
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Recording started:', response.data);
      return {
        resourceId: response.data.resourceId,
        sid: response.data.sid
      };
    } catch (error: any) {
      console.error('❌ Failed to start recording:', {
        error: error.response?.data || error.message,
        channelName
      });
      return null;
    }
  }

  private async acquireRecordingResource(channelName: string, uid: string): Promise<string | null> {
    try {
      const credentials = Buffer.from(`${AGORA_RESTFUL_ID}:${AGORA_RESTFUL_SECRET}`).toString('base64');
      
      const response = await axios.post(
        `https://api.agora.io/v1/apps/${AGORA_APP_ID}/cloud_recording/acquire`,
        {
          cname: channelName,
          uid: uid,
          clientRequest: {}
        },
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.resourceId;
    } catch (error) {
      console.error('❌ Failed to acquire recording resource:', error);
      return null;
    }
  }
}

export const agoraService = new AgoraService();
export default agoraService;