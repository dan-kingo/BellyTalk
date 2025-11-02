import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_KEY = process.env.HMS_ACCESS_KEY || '';
const SECRET = process.env.HMS_SECRET || '';
const API_BASE = process.env.HMS_API_BASE || 'https://api.100ms.live/v2';
const AUTH_TOKEN_TTL = Number(process.env.HMS_TOKEN_TTL) || 86400;

// Debug logging
console.log('HMS Config:', {
  accessKey: ACCESS_KEY ? 'SET' : 'MISSING',
  secret: SECRET ? 'SET' : 'MISSING',
  apiBase: API_BASE
});

class HMSService {
  private managementToken?: string;
  private managementTokenExpiresAt = 0;

  /**
   * Generate management token for API calls
   */
  private async getManagementToken(): Promise<string> {
    // Return existing token if still valid
    if (this.managementToken && Date.now() < this.managementTokenExpiresAt) {
      return this.managementToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      access_key: ACCESS_KEY,
      type: 'management',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + 86400 // 24 hours
    };

    this.managementToken = jwt.sign(payload, SECRET, { algorithm: 'HS256' });
    this.managementTokenExpiresAt = Date.now() + 86400000; // 24 hours in ms
    
    return this.managementToken;
  }

  /**
   * Internal: perform a request to 100ms REST API using management token
   */
  async apiRequest<T = any>(method: "get" | "post" | "put" | "delete", path: string, data?: any, params?: any) {
    if (!ACCESS_KEY || !SECRET) {
      throw new Error('HMS credentials not configured');
    }

    const token = await this.getManagementToken();
    const url = `${API_BASE}${path}`;
    
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const res = await axios.request<T>({ 
        method, 
        url, 
        headers, 
        data, 
        params 
      });
      return res.data;
    } catch (error: any) {
      console.error('HMS API Request failed:', {
        method,
        path,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Create a room for audio call
   */
  async createRoom(options: Record<string, any> = {}) {
    if (!ACCESS_KEY || !SECRET) {
      console.log('HMS not configured, using mock room');
      return {
        id: `mock-room-${Date.now()}`,
        name: options.name || 'mock-room',
        enabled: true,
        description: options.description,
      };
    }

    try {
      // Default room configuration for audio calls
      const roomConfig = {
        name: options.name,
        description: options.description || '1:1 Audio Call',
        template_id: options.template_id || process.env.HMS_TEMPLATE_ID,
        region: options.region || 'us',
        ...options
      };

      console.log('Creating HMS room with config:', roomConfig);
      const response = await this.apiRequest("post", "/rooms", roomConfig);
      console.log('HMS createRoom success:', response);
      return response;
    } catch (error: any) {
      console.error('HMS createRoom failed:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('HMS authentication failed. Please check HMS credentials.');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid room configuration';
        throw new Error(`HMS bad request: ${errorMsg}`);
      } else if (error.response?.status === 404) {
        throw new Error('HMS template not found. Please check HMS_TEMPLATE_ID.');
      }

      throw new Error(`Failed to create room: ${error.message}`);
    }
  }

  /**
   * Generate an auth token for a user to join a room
   * Follows 100ms token format: https://www.100ms.live/docs/server-side/v2/how-to-guides/configure-token
   */
  generateAuthToken(payload: {
    room_id: string;
    user_id: string;
    role: string;
    user_name?: string;
    ttl?: number;
  }) {
    if (!ACCESS_KEY || !SECRET) {
      return `mock-token-${Date.now()}`;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = payload.ttl ?? AUTH_TOKEN_TTL;

    // 100ms token payload format
    const tokenPayload = {
      access_key: ACCESS_KEY,
      room_id: payload.room_id,
      user_id: payload.user_id,
      role: payload.role,
      type: 'app',
      version: 2,
      iat: now,
      nbf: now,
      exp: now + ttl
    };

    // Add user_name if provided (some SDK versions use this)
    if (payload.user_name) {
      (tokenPayload as any).user_name = payload.user_name;
    }

    try {
      const token = jwt.sign(tokenPayload, SECRET, { algorithm: 'HS256' });
      return token;
    } catch (error) {
      console.error('Failed to generate HMS auth token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Get room details
   */
  async getRoom(roomId: string) {
    return await this.apiRequest("get", `/rooms/${roomId}`);
  }

  /**
   * Check if room exists and is active
   */
  async validateRoom(roomId: string): Promise<boolean> {
    try {
      const room = await this.getRoom(roomId);
      return room && room.enabled !== false;
    } catch (error) {
      return false;
    }
  }
}

export const hmsService = new HMSService();
export default hmsService;