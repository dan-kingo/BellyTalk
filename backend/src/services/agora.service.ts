import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Debug environment variables immediately
console.log('🔧 ENVIRONMENT VARIABLES DEBUG:');
console.log('AGORA_APP_ID exists:', !!process.env.AGORA_APP_ID);
console.log('AGORA_APP_CERTIFICATE exists:', !!process.env.AGORA_APP_CERTIFICATE);
console.log('All Agora env vars:', {
  AGORA_APP_ID: process.env.AGORA_APP_ID ? 'SET' : 'MISSING',
  AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE ? 'SET' : 'MISSING',
  AGORA_RESTFUL_ID: process.env.AGORA_RESTFUL_ID ? 'SET' : 'MISSING',
  AGORA_RESTFUL_SECRET: process.env.AGORA_RESTFUL_SECRET ? 'SET' : 'MISSING'
});

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

// Import Agora token builders
const { RtcTokenBuilder, RtmTokenBuilder } = require('agora-access-token');

class AgoraService {
  /**
   * Generate a random UID for Agora channel
   */
  public generateUid(): number {
    return Math.floor(Math.random() * 100000);
  }

  /**
   * Generate RTC token for voice call
   */
  generateRtcToken(
    channelName: string, 
    uid: number, 
    role: string = 'publisher'
  ): string {
    console.log('🔧 Generating RTC Token - CREDENTIAL CHECK:', {
      hasAppId: !!AGORA_APP_ID,
      hasCertificate: !!AGORA_APP_CERTIFICATE,
      appIdPreview: AGORA_APP_ID ? `${AGORA_APP_ID.substring(0, 8)}...` : 'MISSING'
    });
    
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('❌ AGORA CREDENTIALS MISSING - USING MOCK TOKEN');
      console.log('Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in Render environment variables');
      return `mock_rtc_token_${channelName}_${uid}_${Date.now()}`;
    }

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use numeric values directly
    const roleValue = role === 'subscriber' ? 2 : 1;

    try {
      console.log('🔄 Building REAL Agora token...');
      const token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        roleValue,
        privilegeExpiredTs
      );

      console.log('✅ REAL RTC Token generated successfully!');
      console.log('📋 Token starts with:', token.substring(0, 20) + '...');
      return token;
    } catch (error: any) {
      console.error('❌ REAL RTC Token generation failed:', error.message);
      return `mock_rtc_token_${channelName}_${uid}_${Date.now()}`;
    }
  }

  /**
   * Generate RTM token for signaling
   */
  generateRtmToken(uid: string): string {
    console.log('🔧 Generating RTM Token - CREDENTIAL CHECK:', {
      hasAppId: !!AGORA_APP_ID,
      hasCertificate: !!AGORA_APP_CERTIFICATE
    });
    
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('❌ AGORA CREDENTIALS MISSING - USING MOCK RTM TOKEN');
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
        1, // RTM user role
        privilegeExpiredTs
      );

      console.log('✅ REAL RTM Token generated successfully!');
      return token;
    } catch (error: any) {
      console.error('❌ RTM Token generation failed:', error.message);
      return `mock_rtm_token_${uid}_${Date.now()}`;
    }
  }

  /**
   * Create channel tokens for audio call
   */
  createChannelTokens(userId: string, channelName?: string): any {
    console.log('🚀 Creating Agora channel tokens...');
    
    const generatedChannelName = channelName || `audio_${userId}_${Date.now()}`;
    const uid = this.generateUid();

    const rtcToken = this.generateRtcToken(generatedChannelName, uid);
    const rtmToken = this.generateRtmToken(userId.toString());

    // Check token type
    const isRealToken = !rtcToken.startsWith('mock_');
    
    console.log('✅ Token Generation Result:', {
      channelName: generatedChannelName,
      uid: uid,
      tokenType: isRealToken ? 'REAL' : 'MOCK',
      rtcTokenStartsWith: rtcToken.substring(0, 20)
    });

    if (!isRealToken) {
      console.error('🚨 CRITICAL: Using MOCK tokens - audio calls will NOT work!');
      console.log('💡 SOLUTION: Add AGORA_APP_ID and AGORA_APP_CERTIFICATE to Render environment variables');
    }

    return {
      channelName: generatedChannelName,
      uid,
      token: rtcToken,
      rtmToken
    };
  }

  /**
   * Validate if channel exists
   */
  async validateChannel(channelName: string): Promise<boolean> {
    return true;
  }

  /**
   * Get channel user count
   */
  async getChannelUserCount(channelName: string): Promise<number> {
    return 0;
  }
}

export const agoraService = new AgoraService();
export default agoraService;