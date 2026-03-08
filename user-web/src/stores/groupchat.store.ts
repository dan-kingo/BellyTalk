import { create } from "zustand";
import { groupChatService } from "../services/groupchat.service";
import { supabase } from "../services/supabase";
import { GroupMessage, GroupRoom } from "../types";

type GroupChatStore = {
  groups: GroupRoom[];
  selectedGroup: GroupRoom | null;
  messages: GroupMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  activeRoomId: string | null;
  subscription: { unsubscribe: () => void } | null;
  fetchGroups: () => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  joinGroup: (roomId: string) => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<GroupRoom>;
  sendMessage: (roomId: string, message: string) => Promise<void>;
  selectGroup: (group: GroupRoom | null) => Promise<void>;
  subscribeToMessages: (roomId: string) => void;
  unsubscribeFromMessages: () => void;
  clearError: () => void;
};

export const useGroupChatStore = create<GroupChatStore>((set, get) => ({
  groups: [],
  selectedGroup: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,
  activeRoomId: null,
  subscription: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const response = await groupChatService.listGroups();
      set({
        groups: response.groups || [],
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load groups:", error);
      set({ loading: false, error: "Failed to load groups" });
      throw error;
    }
  },

  fetchMessages: async (roomId: string) => {
    try {
      const response = await groupChatService.listMessages(roomId);
      set({ messages: response.messages || [] });
    } catch (error) {
      console.error("Failed to load messages:", error);
      set({ error: "Failed to load messages" });
      throw error;
    }
  },

  joinGroup: async (roomId: string) => {
    try {
      await groupChatService.joinGroup(roomId);
    } catch (error: any) {
      if (
        error.response?.status === 409 ||
        error.response?.data?.error?.includes("already")
      ) {
        return;
      }
      console.error("Failed to join group:", error);
      set({ error: "Failed to join group" });
      throw error;
    }
  },

  createGroup: async (name: string, description?: string) => {
    set({ error: null });
    try {
      const response = await groupChatService.createGroup(name, description);
      const newGroup = response.group as GroupRoom;

      await get().joinGroup(newGroup.id);
      await get().fetchGroups();

      return newGroup;
    } catch (error) {
      console.error("Failed to create group:", error);
      set({ error: "Failed to create group" });
      throw error;
    }
  },

  sendMessage: async (roomId: string, message: string) => {
    set({ sending: true, error: null });
    try {
      await groupChatService.sendMessage(roomId, message);
      set({ sending: false });
    } catch (error) {
      console.error("Failed to send message:", error);
      set({ sending: false, error: "Failed to send message" });
      throw error;
    }
  },

  selectGroup: async (group: GroupRoom | null) => {
    if (!group) {
      get().unsubscribeFromMessages();
      set({ selectedGroup: null, messages: [], activeRoomId: null });
      return;
    }

    await get().joinGroup(group.id);
    set({ selectedGroup: group, activeRoomId: group.id });
    await get().fetchMessages(group.id);
    get().subscribeToMessages(group.id);
  },

  subscribeToMessages: (roomId: string) => {
    get().unsubscribeFromMessages();

    const channel = supabase
      .channel(`group-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from("group_messages")
            .select("*, profiles(full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();

          if (!newMessage) return;

          set((state) => {
            if (state.activeRoomId !== roomId) {
              return state;
            }

            const alreadyExists = state.messages.some(
              (message) => message.id === newMessage.id,
            );
            if (alreadyExists) {
              return state;
            }

            return {
              messages: [...state.messages, newMessage as GroupMessage],
            };
          });
        },
      )
      .subscribe();

    set({ subscription: channel as unknown as { unsubscribe: () => void } });
  },

  unsubscribeFromMessages: () => {
    const currentSubscription = get().subscription;
    if (currentSubscription) {
      currentSubscription.unsubscribe();
    }
    set({ subscription: null });
  },

  clearError: () => set({ error: null }),
}));
