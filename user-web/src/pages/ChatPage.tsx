import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chat.service';
import { presenceService } from '../services/presence.service';
import { Conversation, Message } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Layout from '../components/layout/Layout';
import TypingIndicator from '../components/chat/TypingIndicator';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState<string>('offline');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();

    if (user?.id) {
      presenceService.updatePresence(user.id, 'online');

      const interval = setInterval(() => {
        presenceService.updatePresence(user.id, 'online');
      }, 30000);

      return () => {
        clearInterval(interval);
        presenceService.updatePresence(user.id, 'offline');
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation && user) {
      setMessages([]);
      setHasMore(true);
      loadMessages(selectedConversation.id);

      const otherUserId = getOtherParticipantId(selectedConversation);

      presenceService.getPresence(otherUserId).then(presence => {
        setOtherUserStatus(presence?.status || 'offline');
      });

      const presenceChannel = presenceService.subscribeToPresence(otherUserId, (status) => {
        setOtherUserStatus(status);
      });

      const typingChannel = presenceService.subscribeToTyping(
        selectedConversation.id,
        user.id,
        (isTyping) => {
          setIsOtherUserTyping(isTyping);
        }
      );

      return () => {
        presenceChannel.unsubscribe();
        typingChannel.unsubscribe();
      };
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.listConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, append = false) => {
    try {
      const oldestMessageId = append && messages.length > 0 ? messages[0].id : undefined;
      const response = await chatService.getMessages(conversationId, {
        limit: 30,
        before: oldestMessageId
      });
      const newMessages = response.messages || [];

      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(newMessages.length === 30);
      } else {
        setMessages(newMessages);
        setHasMore(newMessages.length === 30);
      }

      await chatService.markMessagesSeen(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleLoadMore = async () => {
    if (!selectedConversation || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0;
      await loadMessages(selectedConversation.id, true);

      setTimeout(() => {
        if (messagesContainerRef.current) {
          const newScrollHeight = messagesContainerRef.current.scrollHeight;
          messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
        }
      }, 100);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    presenceService.setTyping(selectedConversation.id, user.id, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      presenceService.setTyping(selectedConversation.id, user.id, false);
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageContent.trim() || !selectedConversation || !user) {
      return;
    }

    try {
      setSending(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      presenceService.setTyping(selectedConversation.id, user.id, false);

      const formData = new FormData();
      formData.append('conversationId', selectedConversation.id);
      formData.append('content', messageContent);

      const response = await chatService.sendMessage(formData);
      setMessages([...messages, response.message]);
      setMessageContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipantId = (conversation: Conversation) => {
    return conversation.participant_a === user?.id
      ? conversation.participant_b
      : conversation.participant_a;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-12rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-300 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-600 dark:text-gray-400">
            No conversations yet
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  Conversation {getOtherParticipantId(conversation).substring(0, 8)}
                </div>
                {conversation.last_message && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {conversation.last_message}
                  </div>
                )}
                {conversation.last_message_at && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(conversation.last_message_at).toLocaleString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chat
                </h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${otherUserStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {otherUserStatus}
                  </span>
                </div>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-900"
            >
              {hasMore && messages.length > 0 && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-sm text-primary dark:text-secondary hover:underline disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load previous messages'}
                  </button>
                </div>
              )}
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div
                      className={`max-w-[70%] sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {isOtherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-2 shadow-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700">
              <div className="flex gap-2 items-end">
                <input
                  type="text"
                  value={messageContent}
                  onChange={(e) => {
                    setMessageContent(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Message..."
                  disabled={sending}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary"
                />
                <button
                  type="submit"
                  disabled={sending || !messageContent.trim()}
                  className="bg-primary hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white p-3 rounded-full disabled:opacity-50 transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
                >
                  {sending ? '...' : '➤'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 dark:text-gray-400">
            Select a conversation to start chatting
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
};

export default ChatPage;
