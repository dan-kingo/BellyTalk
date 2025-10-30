import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chat.service';
import { presenceService } from '../services/presence.service';
import { supabase } from '../services/supabase';
import { Conversation, Message, Profile } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Layout from '../components/layout/Layout';
import TypingIndicator from '../components/chat/TypingIndicator';
import { Search, Paperclip, Send, Plus, X, File } from 'lucide-react';

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
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!user?.id) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            setMessages((prev) => [...prev, newMessage]);
            chatService.markMessagesSeen(selectedConversation.id);
          }
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            setMessages((prev) => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, selectedConversation]);

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
      const oldestMessage = append && messages.length > 0 ? messages[0] : undefined;
      const response = await chatService.getMessages(conversationId, {
        limit: 30,
        before: oldestMessage?.created_at
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + attachments.length > 5) {
      alert('You can only attach up to 5 files');
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!messageContent.trim() && attachments.length === 0) || !selectedConversation || !user) {
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

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      await chatService.sendMessage(formData);
      setMessageContent('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const response = await chatService.searchUsers(query);
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const response = await chatService.createConversation(userId);
      setShowNewChatDialog(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadConversations();
      const newConv = response.conversation;
      setSelectedConversation(newConv);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to start conversation');
    }
  };

  const getOtherParticipantId = (conversation: Conversation) => {
    return conversation.participant_a === user?.id
      ? conversation.participant_b
      : conversation.participant_a;
  };

  const getOtherParticipantProfile = (conversation: Conversation) => {
    return conversation.participant_a === user?.id
      ? conversation.participant_b_profile
      : conversation.participant_a_profile;
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderAttachment = (attachment: any) => {
    const isImage = attachment.resource_type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(attachment.format);

    if (isImage) {
      return (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={attachment.url}
            alt={attachment.original_filename}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <File className="w-5 h-5" />
        <span className="text-sm truncate max-w-xs">{attachment.original_filename}</span>
      </a>
    );
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
      <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="w-full md:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Messages</h2>
            <button
              onClick={() => setShowNewChatDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary dark:bg-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No conversations yet
              </div>
            ) : (
              <div>
                {conversations.map((conversation) => {
                  const otherProfile = getOtherParticipantProfile(conversation);
                  const isSelected = selectedConversation?.id === conversation.id;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors ${
                        isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-lg">
                            {otherProfile?.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          {conversation.unread_count! > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary dark:bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {conversation.unread_count}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {otherProfile?.full_name || 'Unknown User'}
                            </h3>
                            {conversation.last_message_at && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                {formatTime(conversation.last_message_at)}
                              </span>
                            )}
                          </div>
                          {conversation.last_message && (
                            <p className={`text-sm truncate ${
                              conversation.unread_count! > 0
                                ? 'text-gray-900 dark:text-white font-medium'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {conversation.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
          {selectedConversation ? (
            <>
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                    {getOtherParticipantProfile(selectedConversation)?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getOtherParticipantProfile(selectedConversation)?.full_name || 'Unknown User'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${otherUserStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {otherUserStatus === 'online' ? 'online' : 'offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2"
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
                  const attachments = message.metadata?.attachments || [];

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                    >
                      <div
                        className={`max-w-[70%] sm:max-w-md px-3 py-2 rounded-2xl shadow-sm ${
                          isOwn
                            ? 'bg-primary dark:bg-secondary text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                        }`}
                      >
                        {attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {attachments.map((attachment: any, idx: number) => (
                              <div key={idx}>{renderAttachment(attachment)}</div>
                            ))}
                          </div>
                        )}
                        {message.content && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isOtherUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-sm">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                {attachments.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="relative flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center relative">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <File className="w-8 h-8 text-gray-400" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-20">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={messageContent}
                    onChange={(e) => {
                      setMessageContent(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!messageContent.trim() && attachments.length === 0)}
                    className="bg-primary hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white p-3 rounded-full disabled:opacity-50 transition-all shrink-0 w-12 h-12 flex items-center justify-center"
                  >
                    {sending ? '...' : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">Select a conversation to start chatting</p>
                <button
                  onClick={() => setShowNewChatDialog(true)}
                  className="text-primary dark:text-secondary hover:underline"
                >
                  or start a new chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChatDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Chat</h3>
              <button
                onClick={() => {
                  setShowNewChatDialog(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searchingUsers ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'Search for users to start a chat'}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((userProfile) => (
                    <button
                      key={userProfile.id}
                      onClick={() => handleStartChat(userProfile.id)}
                      className="w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                        {userProfile.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">{userProfile.full_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">
                        {userProfile.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ChatPage;
