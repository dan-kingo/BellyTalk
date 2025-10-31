import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Users, Plus, Send, ArrowLeft } from 'lucide-react';

interface GroupRoom {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface GroupMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const GroupChatPage: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRoom[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupRoom | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
      subscribeToMessages(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_rooms')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`group-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('group_messages')
            .select('*, profiles(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('group_rooms')
        .insert([{
          name: newGroup.name,
          description: newGroup.description,
          created_by: user?.id,
        }])
        .select('*, profiles(full_name)')
        .single();

      if (error) throw error;

      await supabase
        .from('group_participants')
        .insert([{
          room_id: data.id,
          user_id: user?.id,
        }]);

      setGroups([data, ...groups]);
      setNewGroup({ name: '', description: '' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const handleJoinGroup = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('group_participants')
        .insert([{
          room_id: roomId,
          user_id: user?.id,
        }]);

      if (error && error.code !== '23505') {
        throw error;
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedGroup) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('group_messages')
        .insert([{
          room_id: selectedGroup.id,
          sender_id: user?.id,
          message: messageContent,
        }]);

      if (error) throw error;
      setMessageContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectGroup = async (group: GroupRoom) => {
    await handleJoinGroup(group.id);
    setSelectedGroup(group);
    if (isMobile) {
      setShowMobileChat(true);
    }
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
        <div className={`${isMobile ? (showMobileChat ? 'hidden' : 'flex') : 'flex'} w-full md:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Group Chats</h2>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="p-2 cursor-pointer text-primary dark:text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No groups yet. Create one to get started!
              </div>
            ) : (
              <div>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className={`w-full p-4 border-b cursor-pointer border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition ${
                      selectedGroup?.id === group.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {group.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Created by {group.profiles?.full_name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${isMobile ? (showMobileChat ? 'flex' : 'hidden') : 'flex'} flex-1 flex-col bg-gray-50 dark:bg-gray-950`}>
          {selectedGroup ? (
            <>
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="p-2 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {selectedGroup.name}
                    </h3>
                    {selectedGroup.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs sm:max-w-md`}>
                        {!isOwn && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2">
                            {message.profiles?.full_name || 'Unknown User'}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl shadow-sm ${
                            isOwn
                              ? 'bg-primary dark:bg-secondary text-white rounded-br-sm'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-secondary"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageContent.trim()}
                    className="bg-primary cursor-pointer hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white p-2 rounded-full disabled:opacity-50 transition w-10 h-10 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Users className="w-20 h-20 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <p className="text-lg">Select a group to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setNewGroup({ name: '', description: '' });
        }}
        title="Create New Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 cursor-pointer bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              Create Group
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateDialog(false);
                setNewGroup({ name: '', description: '' });
              }}
              className="px-6 cursor-pointer py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </Layout>
  );
};

export default GroupChatPage;
