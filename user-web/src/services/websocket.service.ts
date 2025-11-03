// src/services/websocket.service.ts

import { supabase } from "./supabase";

class WebSocketService {
  private static instance: WebSocketService;
  private channel: any = null;
  private subscriptions: Map<string, (payload: any) => void> = new Map();

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async subscribeToIncomingCalls(userId: string, callback: (payload: any) => void) {
    try {
      console.log('🔔 Subscribing to incoming calls for user:', userId);
      
      // Unsubscribe from existing channel if any
      this.unsubscribe();

      this.channel = supabase
        .channel(`incoming-calls-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audio_sessions',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📞 Incoming call notification:', payload);
            callback(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'audio_sessions',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            console.log('📞 Call status update:', payload);
            callback(payload);
          }
        )
        .subscribe((status: string) => {
          console.log('📡 WebSocket subscription status:', status);
        });

      // Store the subscription
      this.subscriptions.set(userId, callback);

      return this.channel;
    } catch (error) {
      console.error('❌ Failed to subscribe to incoming calls:', error);
      throw error;
    }
  }

  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.subscriptions.clear();
      console.log('🔕 Unsubscribed from WebSocket');
    }
  }

  isSubscribed(): boolean {
    return this.channel !== null;
  }
}

export const webSocketService = WebSocketService.getInstance();