// src/services/hms.service.ts
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_KEY = process.env.HMS_ACCESS_KEY!;
const SECRET = process.env.HMS_SECRET!;
const API_BASE = process.env.HMS_API_BASE ;
const AUTH_TOKEN_TTL = Number(process.env.HMS_TOKEN_TTL); // seconds

if (!ACCESS_KEY || !SECRET) {
  console.warn("HMS_ACCESS_KEY or HMS_SECRET missing - 100ms integration will fail.");
}

class HMSService {
  private managementToken?: string;
  private managementTokenExpiresAt = 0;

  
  /**
   * Internal: perform a request to 100ms REST API using management token
   */
  async apiRequest<T = any>(method: "get" | "post" | "put" | "delete", path: string, data?: any, params?: any) {
    const mgmt = process.env.HMS_MANAGEMENT_TOKEN!;
    const url = `${API_BASE}${path}`;
    const headers = {
      Authorization: `Bearer ${mgmt}`,
      "Content-Type": "application/json",
    };
    const res = await axios.request<T>({ method, url, headers, data, params });
    return res.data;
  }

  /**
   * Create a room (or return created object from 100ms)
   * options aligns with 100ms Create Room API (name, description, template_id, region, size, large_room etc)
   */
  async createRoom(options: Record<string, any> = {}) {
    return await this.apiRequest("post", "/rooms", options);
  }

  /**
   * Generate an auth token for a user to join a room.
   * This token is a JWT signed with HMS secret. It contains:
   * { room_id, user_id, role, iat, exp, user_name (optional), ... }
   *
   * Note: this token format follows 100ms docs and works with client SDKs expecting an auth token.
   */
  generateAuthToken(payload: {
    room_id: string;
    user_id: string;
    role: string;
    user_name?: string;
    ttl?: number;
    extra?: Record<string, any>;
  }) {
    const now = Math.floor(Date.now() / 1000);
    const ttl = payload.ttl ?? AUTH_TOKEN_TTL;
    const tokenPayload: Record<string, any> = {
      room_id: payload.room_id,
      user_id: payload.user_id,
      role: payload.role,
      user_name: payload.user_name,
      iat: now,
      exp: now + ttl,
      app_access_key: ACCESS_KEY,
      // optional: attach extra fields
      ...(payload.extra || {}),
    };

    // Sign with app secret
    const token = jwt.sign(tokenPayload, SECRET, { algorithm: "HS256" });
    return token;
  }

  /**
   * Optionally: create room codes for roles (if you plan to use Room Codes)
   * @see docs for role-based room codes.
   */
  async createRoomCodes(roomId: string) {
    return await this.apiRequest("post", `/room-codes/room/${roomId}`);
  }
}

export const hmsService = new HMSService();
export default hmsService;
