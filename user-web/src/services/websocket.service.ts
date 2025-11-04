// src/services/websocket.service.ts

import { supabase } from "./supabase";

class WebSocketService {
  private static instance: WebSocketService;
  private channel: any = null;
  private currentUserId: string | null = null;
  private isInitialized = false;
  private callbacks: ((payload: any) => void)[] = [];

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async subscribeToIncomingCalls(userId: string, callback: (payload: any) => void) {
    try {
      console.log('🔔 Subscribing to incoming calls for user:', userId);
      
      // Store callback
      this.callbacks.push(callback);

      // If already subscribed for this user, just add callback and check existing calls
      if (this.channel && this.currentUserId === userId) {
        console.log('✅ Already subscribed, checking for existing calls...');
        await this.checkExistingCalls(userId, callback);
        return this.channel;
      }

      // Unsubscribe from existing channel if any
      this.unsubscribe();

      this.currentUserId = userId;

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
            console.log('📞 NEW incoming call notification:', payload);
            this.callbacks.forEach(cb => cb(payload));
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
            this.callbacks.forEach(cb => cb(payload));
          }
        )
        .subscribe((status: string) => {
          console.log('📡 WebSocket subscription status:', status);
          if (status === 'SUBSCRIBED') {
            this.isInitialized = true;
            // Check for existing pending calls once subscribed
            this.checkExistingCalls(userId, callback);
          }
        });

      return this.channel;
    } catch (error) {
      console.error('❌ Failed to subscribe to incoming calls:', error);
      throw error;
    }
  }

  private async checkExistingCalls(userId: string, callback: (payload: any) => void) {
    try {
      console.log('🔍 Checking for existing pending calls...');
      
      // Query for any pending calls for this user
      const { data: pendingCalls, error } = await supabase
        .from('audio_sessions')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error checking pending calls:', error);
        return;
      }

      if (pendingCalls && pendingCalls.length > 0) {
        console.log(`📞 Found ${pendingCalls.length} pending call(s):`, pendingCalls);
        
        // Trigger callbacks for each pending call
        pendingCalls.forEach(session => {
          const payload = {
            eventType: 'INSERT',
            new: session,
            old: null
          };
          callback(payload);
        });
      } else {
        console.log('✅ No pending calls found');
      }
    } catch (error) {
      console.error('❌ Error in checkExistingCalls:', error);
    }
  }
// In your websocket.service.ts - update the subscribeToCallEndEvents method
async subscribeToCallEndEvents(userId: string, callback: (payload: any) => void) {
  try {
    console.log('🔔 Subscribing to call end events for user:', userId);
    
    const channel = supabase
      .channel(`call-end-events-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audio_sessions',
          filter: `initiator_id=eq.${userId} OR receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📞 CALL END EVENT RECEIVED:', {
            sessionId: payload.new.id,
            oldStatus: payload.old?.status,
            newStatus: payload.new.status,
            userId: userId,
            matchesInitiator: payload.new.initiator_id === userId,
            matchesReceiver: payload.new.receiver_id === userId
          });
          
          // Only trigger for ended calls
          if (payload.new.status === 'ended') {
            console.log('🎯 TRIGGERING CALL END CALLBACK for session:', payload.new.id);
            callback(payload);
          } else {
            console.log('ℹ️ Status update but not ended:', payload.new.status);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('📡 Call end events subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to call end events');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to call end events');
        }
      });

    return channel;
  } catch (error) {
    console.error('❌ Failed to subscribe to call end events:', error);
    throw error;
  }
}
  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.currentUserId = null;
      this.isInitialized = false;
      this.callbacks = [];
      console.log('🔕 Unsubscribed from WebSocket');
    }
  }

  removeCallback(callback: (payload: any) => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  isSubscribed(): boolean {
    return this.channel !== null && this.isInitialized;
  }
}

export const webSocketService = WebSocketService.getInstance();