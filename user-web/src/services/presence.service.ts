// services/presence.service.ts
import { supabase } from './supabase';

export interface Presence {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  typing_in_conversation?: string;
  updated_at: string;
}

class PresenceService {
  private typingChannels = new Map<string, any>();
  private presenceChannels = new Map<string, any>();

  async updatePresence(userId: string, status: 'online' | 'offline' | 'away', typingInConversation?: string | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          last_seen: new Date().toISOString(),
          typing_in_conversation: typingInConversation || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating presence:', error);
        // Don't throw to prevent breaking the app
      }
    } catch (error) {
      console.error('Failed to update presence:', error);
      // Don't throw error to prevent breaking the app
    }
  }

  async getPresence(userId: string): Promise<Presence | null> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single

      if (error) {
        console.error('Error getting presence:', error);
        return this.getDefaultPresence(userId);
      }

      // If no data found, return default offline presence
      if (!data) {
        return this.getDefaultPresence(userId);
      }

      return data;
    } catch (error) {
      console.error('Failed to get presence:', error);
      return this.getDefaultPresence(userId);
    }
  }

  private getDefaultPresence(userId: string): Presence {
    return {
      user_id: userId,
      status: 'offline',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      if (isTyping) {
        await this.updatePresence(userId, 'online', conversationId);
      } else {
        await this.updatePresence(userId, 'online', null);
      }
    } catch (error) {
      console.error('Failed to set typing:', error);
    }
  }

  subscribeToPresence(userId: string, callback: (status: string) => void): any {
    try {
      // Unsubscribe from existing channel if any
      if (this.presenceChannels.has(userId)) {
        this.presenceChannels.get(userId).unsubscribe();
      }

      const channel = supabase
        .channel(`presence:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (payload.new) {
              const presence = payload.new as Presence;
              callback(presence.status);
            } else if (payload.eventType === 'DELETE') {
              // If presence record is deleted, assume offline
              callback('offline');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to presence for user: ${userId}`);
          }
        });

      this.presenceChannels.set(userId, channel);
      return channel;
    } catch (error) {
      console.error('Failed to subscribe to presence:', error);
      return { unsubscribe: () => {} };
    }
  }

  subscribeToTyping(conversationId: string, currentUserId: string, callback: (isTyping: boolean) => void): any {
    try {
      const channelKey = `typing:${conversationId}:${currentUserId}`;
      
      // Unsubscribe from existing channel if any
      if (this.typingChannels.has(channelKey)) {
        this.typingChannels.get(channelKey).unsubscribe();
      }

      const channel = supabase
        .channel(`typing:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_presence',
            filter: `typing_in_conversation=eq.${conversationId}`
          },
          (payload) => {
            const presence = payload.new as Presence;
            // Only trigger if it's not the current user and we have a presence record
            if (presence && presence.user_id !== currentUserId) {
              callback(!!presence.typing_in_conversation);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to typing for conversation: ${conversationId}`);
          }
        });

      this.typingChannels.set(channelKey, channel);
      return channel;
    } catch (error) {
      console.error('Failed to subscribe to typing:', error);
      return { unsubscribe: () => {} };
    }
  }

  // Initialize presence for a user if it doesn't exist
  async initializePresence(userId: string): Promise<void> {
    try {
      const existingPresence = await this.getPresence(userId);
      if (!existingPresence || existingPresence.status === 'offline') {
        await this.updatePresence(userId, 'online');
      }
    } catch (error) {
      console.error('Failed to initialize presence:', error);
    }
  }

  // Cleanup method to unsubscribe all channels
  cleanup() {
    this.typingChannels.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing typing channel:', error);
      }
    });
    this.presenceChannels.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing presence channel:', error);
      }
    });
    this.typingChannels.clear();
    this.presenceChannels.clear();
  }
}

export const presenceService = new PresenceService();