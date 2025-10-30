import { supabase } from './supabase';

export const presenceService = {
  async updatePresence(userId: string, status: 'online' | 'offline') {
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          last_seen: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  },

  async getPresence(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting presence:', error);
      return null;
    }
  },

  subscribeToPresence(userId: string, callback: (status: string) => void) {
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
        (payload: any) => {
          callback(payload.new?.status || 'offline');
        }
      )
      .subscribe();

    return channel;
  },

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    try {
      if (isTyping) {
        const { error } = await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: userId,
            is_typing: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'conversation_id,user_id' });

        if (error) throw error;
      } else {
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error setting typing:', error);
    }
  },

  subscribeToTyping(conversationId: string, userId: string, callback: (isTyping: boolean) => void) {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          if (payload.new?.user_id !== userId) {
            callback(payload.new?.is_typing || false);
          } else if (payload.eventType === 'DELETE' && payload.old?.user_id !== userId) {
            callback(false);
          }
        }
      )
      .subscribe();

    return channel;
  }
};
