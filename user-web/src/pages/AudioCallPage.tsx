// Update your existing AudioCallPage component
import React, { useState, useEffect } from 'react';
import { useAgora } from '../contexts/AgoraContext';
import { audioService } from '../services/audio.service';
import { chatService } from '../services/chat.service';
import { webSocketService } from '../services/websocket.service';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Phone, PhoneOff, Mic, MicOff, Search, User, Users } from 'lucide-react';
import { Profile } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

const AudioCallPage: React.FC = () => {
  const { 
    join, 
    leave, 
    mute, 
    joinState, 
    remoteUsers, 
    isMuted, 
    connectionState 
  } = useAgora();
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

  // Auto-join incoming audio calls
  useEffect(() => {
    if (location.state?.isIncomingCall && location.state?.autoJoin && !currentSession && !joinState) {
      const { session, caller } = location.state;
      console.log('🎵 AUTO-JOINING incoming audio call:', { session, caller });
      
      // Set the session and remote user
      setCurrentSession(session);
      setRemoteUser(caller);
      
      // Automatically join the audio call
      handleJoinIncomingCall(session);
      
      // Clear the autoJoin flag to prevent re-joining
      navigate('/audio-call', { 
        state: { 
          ...location.state,
          autoJoin: false 
        },
        replace: true 
      });
    }
  }, [location.state, currentSession, joinState, navigate]);

  // WebSocket listener for call end events
  useEffect(() => {
    if (!user?.id || !currentSession) return;

    console.log('🎯 Setting up call end listener for audio session:', currentSession.id);

    const handleCallEnded = async (payload: any) => {
      const endedSession = payload.new;
      console.log('ENDING CALL WITH ID:', JSON.stringify(currentSession.id));
      console.log('LENGTH:', currentSession.id.length);
      // Check if this is our current session that ended
      if (endedSession.id === currentSession.id && endedSession.status === 'ended') {
        console.log('📞 Audio call ended by other user, leaving channel...');
        
        try {
          // Leave Agora channel
          await leave();
          
          // Update local state
          setCurrentSession(null);
          setCallStatus('Call ended by other user');
          setRemoteUser(null);
          
          console.log('✅ Successfully left audio call after remote end');
          
          // Show call ended message for 3 seconds
          setTimeout(() => {
            setCallStatus('');
          }, 3000);
        } catch (error) {
          console.error('❌ Error leaving call after remote end:', error);
        }
      }
    };

    // Subscribe to call end events
    webSocketService.subscribeToCallEndEvents(user.id, handleCallEnded);

    // Cleanup
    return () => {
      // WebSocket cleanup is handled by the service
    };
  }, [user?.id, currentSession, leave]);

  // Handle browser/tab closing
  useEffect(() => {
    const handleBeforeUnload = async (_: BeforeUnloadEvent) => {
      if (currentSession && joinState) {
        console.log('🔄 Ending audio call due to page unload...');
        
        // End the session when user leaves the page
        try {
          await audioService.endSession(currentSession.id);
        } catch (error) {
          console.error('Error ending audio session on unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSession, joinState]);

  // Update debug info
  useEffect(() => {
    setDebugInfo({
      connectionState,
      joinState,
      remoteUsersCount: remoteUsers.length,
      isMuted,
      currentSession: currentSession?.id,
      channelName: currentSession?.channel_name,
      sessionStatus: currentSession?.status
    });
  }, [connectionState, joinState, remoteUsers, isMuted, currentSession]);

  // Add this useEffect to debug UID issues
  useEffect(() => {
    if (currentSession) {
      console.log('🔍 CURRENT SESSION DEBUG:', {
        sessionId: currentSession.id,
        sessionUid: currentSession.uid,
        channel: currentSession.channel_name,
        status: currentSession.status
      });
    }
  }, [currentSession]);

  // Function to handle joining incoming calls
  const handleJoinIncomingCall = async (session: any) => {
    try {
      setLoading(true);
      setCallStatus('Joining audio call...');

      console.log('🎯 RECEIVER accepting call:', {
        sessionId: session.id,
        sessionUid: session.uid,
        channel: session.channel_name
      });

      // Get tokens for the session
      const authResponse = await audioService.getTokens(session.id);

      console.log('✅ Auth tokens received for RECEIVER:', {
        channelName: authResponse.channelName,
        receiverUid: authResponse.uid,
        initiatorUid: session.uid,
        differentUIDs: authResponse.uid !== session.uid
      });

      // Join the Agora channel with RECEIVER's UID
      const joinConfig = {
        appId: APP_ID || 'c9b0a43d50a947a38c8ba06c6ffec555',
        channel: authResponse.channelName,
        token: authResponse.rtcToken,
        uid: authResponse.uid
      };

      console.log('🔗 RECEIVER joining Agora channel:', joinConfig);
      await join(joinConfig);

      setCallStatus('Connected to call');
      console.log('✅ Receiver joined successfully with UID:', authResponse.uid);

    } catch (error: any) {
      console.error('❌ Failed to join incoming call:', error);
      setErrorMessage(error.response?.data?.error || error.message || 'Failed to join call');
      setCallStatus('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

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

      // 1. Create session with Agora
      setCallStatus('Creating audio session...');
      const sessionResponse = await audioService.createSession(receiverId);
      setCurrentSession(sessionResponse.session);
      
      console.log('✅ Session created:', {
        sessionId: sessionResponse.session.id,
        initiatorUid: sessionResponse.session.uid,
        channel: sessionResponse.session.channel_name
      });

      setCallStatus('Getting auth tokens...');
      
      // 2. Get auth tokens from backend
      const authResponse = await audioService.getTokens(
        sessionResponse.session.id, 
        undefined, 
        'publisher'
      );

      console.log('✅ Auth tokens received for CALLER:', {
        channelName: authResponse.channelName,
        uid: authResponse.uid,
        shouldMatchSession: authResponse.uid === sessionResponse.session.uid
      });

      setCallStatus('Joining audio channel...');

      // 3. Join the Agora channel
      const joinConfig = {
        appId: APP_ID || 'c9b0a43d50a947a38c8ba06c6ffec555',
        channel: authResponse.channelName,
        token: authResponse.rtcToken,
        uid: authResponse.uid
      };

      console.log('🔗 CALLER joining Agora channel:', joinConfig);
      await join(joinConfig);

      console.log('✅ Caller joined successfully with UID:', authResponse.uid);
      setCallStatus('Connected - Waiting for recipient...');
      setShowNewCallDialog(false);
      
    } catch (error: any) {
      console.error('❌ Failed to start call:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to start audio call. Please try again.';
      setErrorMessage(errorMsg);
      setCallStatus('');
      setRemoteUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    try {
      setEndingCall(true);
      setCallStatus('Ending call for both users...');
      
      console.log('🛑 Ending audio call for both users...');
      
      // Leave the Agora channel
      await leave();
      
      // End session in backend - this will trigger WebSocket update to other user
      if (currentSession) {
        await audioService.endSession(currentSession.id);
      }
      
      setCurrentSession(null);
      setCallStatus('Call ended');
      setRemoteUser(null);
      
      console.log('✅ Audio call ended successfully for both users');
      
      // Clear call status after 3 seconds
      setTimeout(() => {
        setCallStatus('');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      setCallStatus('Failed to end call');
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
                <div>Session Status: <span className="font-mono">{debugInfo.sessionStatus || 'None'}</span></div>
                <div>Channel: <span className="font-mono">{debugInfo.channelName || 'None'}</span></div>
                <div>Real Agora Connection: <span className="font-mono">{joinState ? '✅ YES' : '❌ NO'}</span></div>
                <div>Auto-Join Status: <span className="font-mono">{location.state?.autoJoin ? '🔄 PENDING' : '✅ DONE'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <Phone className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {callStatus || 'No Active Call'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {callStatus ? 'The call has ended' : 'Start an audio call with another user or wait for incoming calls'}
            </p>
            {!callStatus && (
              <button
                onClick={() => setShowNewCallDialog(true)}
                className="bg-primary-600 hover:bg-primary-700 cursor-pointer text-white px-8 py-3 rounded-lg transition font-medium inline-flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Start Audio Call
              </button>
            )}
          </div>
        )}

        {/* Existing New Call Dialog remains the same */}
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