import { create } from "zustand";
import { chatService } from "../services/chat.service";
import { Conversation, Message, Profile } from "../types";

type ChatStore = {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  conversationsLoading: boolean;
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  chatError: string | null;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, append?: boolean) => Promise<void>;
  markConversationSeen: (conversationId: string) => Promise<void>;
  selectConversation: (conversation: Conversation | null) => void;
  clearMessages: () => void;
  appendIncomingMessage: (message: Message) => void;
  addOptimisticMessage: (message: Message) => void;
  removeOptimisticMessages: () => void;
  sendMessage: (params: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    attachments: File[];
  }) => Promise<void>;
  searchQuery: string;
  searchResults: Profile[];
  searchingUsers: boolean;
  searchUsers: (query: string) => Promise<void>;
  searchUsersList: (query: string) => Promise<Profile[]>;
  createConversation: (
    userId: string,
    bookingId?: string,
  ) => Promise<Conversation>;
  clearUserSearch: () => void;
  unreadCount: number;
  unreadLoading: boolean;
  unreadError: string | null;
  lastUnreadFetched: number | null;
  unreadRequest: Promise<void> | null;
  fetchUnreadCount: (force?: boolean) => Promise<void>;
  setUnreadCount: (count: number) => void;
  clearUnreadError: () => void;
};

const UNREAD_STALE_TIME_MS = 20_000;

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  conversationsLoading: false,
  messagesLoading: false,
  hasMoreMessages: true,
  chatError: null,
  searchQuery: "",
  searchResults: [],
  searchingUsers: false,

  fetchConversations: async () => {
    set({ conversationsLoading: true, chatError: null });
    try {
      const response = await chatService.listConversations();
      const nextConversations: Conversation[] = response.conversations || [];
      const nextUnreadCount = nextConversations.reduce(
        (total: number, conversation: Conversation) =>
          total + (conversation.unread_count || 0),
        0,
      );

      set((state) => {
        const selectedConversation = state.selectedConversation
          ? nextConversations.find(
              (conversation: Conversation) =>
                conversation.id === state.selectedConversation?.id,
            ) || state.selectedConversation
          : null;

        return {
          conversations: nextConversations,
          selectedConversation,
          unreadCount: nextUnreadCount,
          conversationsLoading: false,
        };
      });
    } catch (error) {
      console.error("Failed to load conversations:", error);
      set({
        conversationsLoading: false,
        chatError: "Failed to load conversations",
      });
      throw error;
    }
  },

  fetchMessages: async (conversationId: string, append = false) => {
    set({ messagesLoading: true, chatError: null });
    try {
      const oldestMessage = append ? get().messages[0] : undefined;
      const response = await chatService.getMessages(conversationId, {
        limit: 30,
        before: oldestMessage?.created_at,
      });
      const newMessages = response.messages || [];

      set((state) => ({
        messages: append ? [...newMessages, ...state.messages] : newMessages,
        hasMoreMessages: newMessages.length === 30,
        messagesLoading: false,
      }));

      await get().markConversationSeen(conversationId);
    } catch (error) {
      console.error("Failed to load messages:", error);
      set({
        messagesLoading: false,
        chatError: "Failed to load messages",
      });
      throw error;
    }
  },

  markConversationSeen: async (conversationId: string) => {
    try {
      await chatService.markMessagesSeen(conversationId);
    } catch (error) {
      console.error("Failed to mark messages seen:", error);
      throw error;
    }
  },

  selectConversation: (conversation) => {
    set({ selectedConversation: conversation });
  },

  clearMessages: () => {
    set({ messages: [], hasMoreMessages: true });
  },

  appendIncomingMessage: (message) => {
    const selectedId = get().selectedConversation?.id;
    if (!selectedId || message.conversation_id !== selectedId) {
      return;
    }

    set((state) => {
      if (state.messages.find((existing) => existing.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });
  },

  addOptimisticMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  removeOptimisticMessages: () => {
    set((state) => ({
      messages: state.messages.filter(
        (message) => !message.id.startsWith("optimistic-"),
      ),
    }));
  },

  sendMessage: async ({
    conversationId,
    senderId,
    receiverId,
    content,
    attachments,
  }) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      seen: false,
      metadata:
        attachments.length > 0
          ? {
              attachments: attachments.map((file) => ({
                url: URL.createObjectURL(file),
                original_filename: file.name,
                resource_type: file.type.startsWith("image/")
                  ? "image"
                  : "file",
                format: file.name.split(".").pop() || "",
                size: file.size,
              })),
            }
          : undefined,
    };

    get().addOptimisticMessage(optimisticMessage);

    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("content", content);
      attachments.forEach((file) => formData.append("attachments", file));

      const response = await chatService.sendMessage(formData);
      const confirmedMessage: Message | undefined = response?.message;

      if (!confirmedMessage) {
        throw new Error(
          "Message send succeeded but no message payload returned",
        );
      }

      set((state) => {
        const messages = state.messages.some(
          (message) => message.id === optimisticId,
        )
          ? state.messages.map((message) =>
              message.id === optimisticId ? confirmedMessage : message,
            )
          : [...state.messages, confirmedMessage];

        const updatedConversations = state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                last_message:
                  confirmedMessage.content ||
                  (confirmedMessage.metadata?.attachments?.length
                    ? "[attachment]"
                    : conversation.last_message),
                last_message_at: confirmedMessage.created_at,
              }
            : conversation,
        );

        const activeConversation = updatedConversations.find(
          (conversation) => conversation.id === conversationId,
        );

        const conversations = activeConversation
          ? [
              activeConversation,
              ...updatedConversations.filter(
                (conversation) => conversation.id !== conversationId,
              ),
            ]
          : updatedConversations;

        return {
          messages,
          conversations,
          selectedConversation:
            state.selectedConversation?.id === conversationId
              ? activeConversation || state.selectedConversation
              : state.selectedConversation,
        };
      });
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter(
          (message) => message.id !== optimisticId,
        ),
      }));
      throw error;
    }
  },

  searchUsers: async (query: string) => {
    const trimmedQuery = query.trim();
    set({ searchQuery: query });

    set({ searchingUsers: true, chatError: null });
    try {
      const response = await chatService.searchUsers(trimmedQuery || undefined);
      const filteredUsers = (response.users || []).filter(
        (user: Profile) => user.role !== "admin",
      );
      set({
        searchResults: filteredUsers,
        searchingUsers: false,
      });
    } catch (error) {
      console.error("Failed to search users:", error);
      set({
        searchingUsers: false,
        chatError: "Failed to search users",
      });
      throw error;
    }
  },

  searchUsersList: async (query: string) => {
    const trimmedQuery = query.trim();

    try {
      const response = await chatService.searchUsers(trimmedQuery || undefined);
      return (response.users || []).filter(
        (user: Profile) => user.role !== "admin",
      );
    } catch (error) {
      console.error("Failed to search users:", error);
      throw error;
    }
  },

  createConversation: async (userId: string, bookingId?: string) => {
    set({ chatError: null });
    try {
      const response = await chatService.createConversation(userId, bookingId);
      const conversation: Conversation = response.conversation;

      set((state) => {
        const exists = state.conversations.some(
          (current) => current.id === conversation.id,
        );
        return {
          conversations: exists
            ? state.conversations.map((current) =>
                current.id === conversation.id ? conversation : current,
              )
            : [conversation, ...state.conversations],
          selectedConversation: conversation,
        };
      });

      await get().fetchConversations();
      return conversation;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      set({ chatError: "Failed to create conversation" });
      throw error;
    }
  },

  clearUserSearch: () => {
    set({ searchQuery: "", searchResults: [], searchingUsers: false });
  },

  unreadCount: 0,
  unreadLoading: false,
  unreadError: null,
  lastUnreadFetched: null,
  unreadRequest: null,

  fetchUnreadCount: async (force = false) => {
    const state = get();

    if (state.unreadRequest) {
      return state.unreadRequest;
    }

    const isFresh =
      state.lastUnreadFetched !== null &&
      Date.now() - state.lastUnreadFetched < UNREAD_STALE_TIME_MS;

    if (!force && isFresh) {
      return;
    }

    const request = (async () => {
      set({ unreadLoading: true, unreadError: null });
      try {
        const response = await chatService.getUnreadCount();
        set({
          unreadCount: response.unread_count ?? 0,
          unreadLoading: false,
          lastUnreadFetched: Date.now(),
        });
      } catch (error) {
        console.error("Failed to load unread count:", error);
        set({
          unreadLoading: false,
          unreadError: "Failed to load unread count",
        });
      } finally {
        set({ unreadRequest: null });
      }
    })();

    set({ unreadRequest: request });
    return request;
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: Math.max(0, count), lastUnreadFetched: Date.now() });
  },

  clearUnreadError: () => set({ unreadError: null }),
}));
