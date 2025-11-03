import React, { useState, useEffect } from 'react';
import { useAgora } from '../contexts/AgoraContext';
import { useAuth } from '../contexts/AuthContext';
import { audioService } from '../services/audio.service';
import { chatService } from '../services/chat.service';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Phone, PhoneOff, Mic, MicOff, Search, User, Users } from 'lucide-react';
import { Profile } from '../types';

const AudioCallPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    join, 
    leave, 
    mute, 
    joinState, 
    remoteUsers, 
    isMuted, 
    connectionState 
  } = useAgora();
  
  const [loading, setLoading] = useState(false);
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [endingCall, setEndingCall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [remoteUser, setRemoteUser] = useState<Profile | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID!
  
  // Update debug info
  useEffect(() => {
    setDebugInfo({
      connectionState,
      joinState,
      remoteUsersCount: remoteUsers.length,
      isMuted,
      currentSession: currentSession?.id,
      channelName: currentSession?.channel_name
    });
  }, [connectionState, joinState, remoteUsers, isMuted, currentSession]);

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await chatService.searchUsers(query);
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleStartCall = async (receiverId: string, userProfile: Profile) => {
  try {
    setLoading(true);
    setErrorMessage('');
    setCallStatus('Creating session...');
    setRemoteUser(userProfile);

    console.log('🚀 Starting audio call process...');
    console.log('🔧 App ID being used:', APP_ID || 'c9b0a43d50a947a38c8ba06c6ffec555');

    // 1. Create session with Agora
    setCallStatus('Creating audio session...');
    const sessionResponse = await audioService.createSession(receiverId);
    setCurrentSession(sessionResponse.session);
    
    console.log('✅ Session created:', sessionResponse.session.id);

    setCallStatus('Getting auth tokens...');
    
    // 2. Get auth tokens from backend
    const authResponse = await audioService.getTokens(
      sessionResponse.session.id, 
      undefined, 
      'publisher', 
      user?.email
    );

    console.log('✅ Auth tokens received:', {
      channelName: authResponse.channelName,
      uid: authResponse.uid,
      hasRtcToken: !!authResponse.rtcToken,
      hasRtmToken: !!authResponse.rtmToken
    });

    // Check if tokens are valid
    if (!authResponse.rtcToken || authResponse.rtcToken.startsWith('mock_')) {
      throw new Error('Invalid or mock token received');
    }

    setCallStatus('Joining audio channel...');

    // 3. Join the Agora channel with the SDK - HARDCODED APP ID
    const joinConfig = {
      appId: APP_ID || 'c9b0a43d50a947a38c8ba06c6ffec555', // Fallback to hardcoded
      channel: authResponse.channelName,
      token: authResponse.rtcToken,
      uid: authResponse.uid
    };

    console.log('🔗 Joining Agora channel with config:', joinConfig);
    
    await join(joinConfig);

    console.log('✅ Join successful!');
    setCallStatus('Connected');
    setShowNewCallDialog(false);
    
  } catch (error: any) {
    console.error('❌ Failed to start call:', error);
    const errorMsg = error.response?.data?.error || error.message || 'Failed to start audio call. Please try again.';
    setErrorMessage(errorMsg);
    setCallStatus('');
    setRemoteUser(null);
    
    // Clean up on error
    if (currentSession) {
      try {
        await audioService.endSession(currentSession.id);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  } finally {
    setLoading(false);
  }
};
  const handleEndCall = async () => {
    try {
      setEndingCall(true);
      setCallStatus('Disconnecting...');
      
      console.log('🛑 Ending call...');
      
      // Leave the Agora channel
      await leave();
      
      // End session in backend
      if (currentSession) {
        await audioService.endSession(currentSession.id);
      }
      
      setCurrentSession(null);
      setCallStatus('');
      setRemoteUser(null);
      
      console.log('✅ Call ended successfully');
    } catch (error) {
      console.error('❌ Failed to end call:', error);
    } finally {
      setEndingCall(false);
    }
  };

  const toggleMute = async () => {
    try {
      console.log('🔇 Toggling mute:', !isMuted);
      await mute(!isMuted);
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap mb-8">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audio Call</h1>
          </div>
        </div>

        {joinState ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center mb-6">
                <User className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Audio Call in Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{callStatus}</p>
              
              {remoteUser && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                    {remoteUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {remoteUser.full_name}
                  </span>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {remoteUsers.length > 0 ? (
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" />
                    {remoteUsers.length} participant{remoteUsers.length > 1 ? 's' : ''} in call
                  </div>
                ) : (
                  'Waiting for other participants...'
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full cursor-pointer transition ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>

            <button
              onClick={handleEndCall}
              disabled={endingCall}
              className="bg-red-600 hover:bg-red-700 cursor-pointer text-white px-8 py-3 rounded-lg transition font-medium flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {endingCall ? (
                <div className="w-5 h-5">
                  <LoadingSpinner />
                </div>
              ) : (
                <PhoneOff className="w-5 h-5" />
              )}
              {endingCall ? 'Ending...' : 'End Call'}
            </button>

            {/* Debug Information */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Agora Debug Info:</h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <div>Connection State: <span className="font-mono">{debugInfo.connectionState}</span></div>
                <div>Joined: <span className="font-mono">{debugInfo.joinState ? '✅ YES' : '❌ NO'}</span></div>
                <div>Remote Users: <span className="font-mono">{debugInfo.remoteUsersCount}</span></div>
                <div>Microphone: <span className="font-mono">{debugInfo.isMuted ? '🔇 MUTED' : '🎤 ACTIVE'}</span></div>
                <div>Session ID: <span className="font-mono">{debugInfo.currentSession || 'None'}</span></div>
                <div>Channel: <span className="font-mono">{debugInfo.channelName || 'None'}</span></div>
                <div>Real Agora Connection: <span className="font-mono">{joinState ? '✅ YES' : '❌ NO'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <Phone className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Active Call
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Start an audio call with another user to get started
            </p>
            <button
              onClick={() => setShowNewCallDialog(true)}
              className="bg-primary-600 hover:bg-primary-700 cursor-pointer text-white px-8 py-3 rounded-lg transition font-medium inline-flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Start Audio Call
            </button>
          </div>
        )}

        <Dialog
          isOpen={showNewCallDialog}
          onClose={() => {
            if (!loading) {
              setShowNewCallDialog(false);
              setSearchQuery('');
              setSearchResults([]);
              setErrorMessage('');
            }
          }}
          title="Start Audio Call"
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {searching ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'Search for users to start an audio call'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((userProfile) => (
                    <button
                      key={userProfile.id}
                      onClick={() => handleStartCall(userProfile.id, userProfile)}
                      disabled={loading}
                      className="w-full cursor-pointer p-4 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold shrink-0">
                        {userProfile.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {userProfile.full_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {userProfile.email}
                        </p>
                      </div>
                      {loading ? (
                        <div className="w-5 h-5">
                          <LoadingSpinner />
                        </div>
                      ) : (
                        <Phone className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AudioCallPage;