// src/pages/VideoCallPage.tsx
import React, { useState, useEffect } from 'react';
import { useAgora } from '../contexts/AgoraContext';
import { audioService } from '../services/audio.service'; // Reuse audio service for video calls
import { chatService } from '../services/chat.service';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Video, Mic, MicOff, PhoneOff, Search, Camera, CameraOff, User, Users } from 'lucide-react';
import { Profile } from '../types';

const VideoCallPage: React.FC = () => {
  const { 
    join, 
    leave, 
    mute, 
    joinState, 
    remoteUsers, 
    isMuted, 
    connectionState,
    localVideoTrack,
    remoteVideoTracks,
    toggleVideo
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID!;

  // Update debug info
  useEffect(() => {
    setDebugInfo({
      connectionState,
      joinState,
      remoteUsersCount: remoteUsers.length,
      isMuted,
      isVideoEnabled,
      currentSession: currentSession?.id,
      channelName: currentSession?.channel_name,
      localVideoTrack: !!localVideoTrack,
      remoteVideoTracks: Object.keys(remoteVideoTracks).length
    });
  }, [connectionState, joinState, remoteUsers, isMuted, isVideoEnabled, currentSession, localVideoTrack, remoteVideoTracks]);

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

      console.log('🚀 Starting video call process...');

      // 1. Create session with Agora (reuse audio service)
      setCallStatus('Creating video session...');
      const sessionResponse = await audioService.createSession(receiverId);
      setCurrentSession(sessionResponse.session);
      
      console.log('✅ Video session created:', sessionResponse.session.id);

      setCallStatus('Getting auth tokens...');
      
      // 2. Get auth tokens from backend
      const authResponse = await audioService.getTokens(
        sessionResponse.session.id, 
        undefined, 
        'publisher'
      );

      console.log('✅ Auth tokens received for video call:', {
        channelName: authResponse.channelName,
        uid: authResponse.uid
      });

      setCallStatus('Joining video channel...');

      // 3. Join the Agora channel with video enabled
      const joinConfig = {
        appId: APP_ID || 'c9b0a43d50a947a38c8ba06c6ffec555',
        channel: authResponse.channelName,
        token: authResponse.rtcToken,
        uid: authResponse.uid,
        enableVideo: true // Enable video for this call
      };

      console.log('🔗 Joining Agora video channel with config:', joinConfig);
      await join(joinConfig);

      console.log('✅ Video join successful!');
      setCallStatus('Connected - Waiting for recipient...');
      setShowNewCallDialog(false);
      
    } catch (error: any) {
      console.error('❌ Failed to start video call:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to start video call. Please try again.';
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
      
      console.log('🛑 Ending video call...');
      
      // Leave the Agora channel
      await leave();
      
      // End session in backend
      if (currentSession) {
        await audioService.endSession(currentSession.id);
      }
      
      setCurrentSession(null);
      setCallStatus('');
      setRemoteUser(null);
      setIsVideoEnabled(true);
      
      console.log('✅ Video call ended successfully');
    } catch (error) {
      console.error('❌ Failed to end video call:', error);
    } finally {
      setEndingCall(false);
    }
  };

  const handleToggleMute = async () => {
    try {
      console.log('🔇 Toggling mute:', !isMuted);
      await mute(!isMuted);
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      console.log('📹 Toggling video:', !isVideoEnabled);
      await toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
    }
  };

  // Auto-play remote video tracks
  useEffect(() => {
    Object.values(remoteVideoTracks).forEach(track => {
      if (track && track.isPlaying === false) {
        track.play(`remote-video-${track.getUserId()}`);
      }
    });
  }, [remoteVideoTracks]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Call</h1>
          </div>
        </div>

        {joinState ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Main Video Area */}
            <div className="relative bg-gray-900 aspect-video">
              {/* Remote Video Streams */}
              {Object.keys(remoteVideoTracks).length > 0 ? (
                <div className="w-full h-full grid grid-cols-1 gap-2 p-2">
                  {Object.entries(remoteVideoTracks).map(([uid, _]) => (
                    <div key={uid} className="w-full h-full bg-black rounded-lg overflow-hidden">
                      <div 
                        id={`remote-video-${uid}`}
                        className="w-full h-full"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        User {uid}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Waiting for other participants...</p>
                    {remoteUser && (
                      <p className="text-gray-500 text-sm mt-2">
                        Calling {remoteUser.full_name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Local Video Preview */}
              {isVideoEnabled && localVideoTrack && (
                <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <div id="local-video" className="w-full h-full" />
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    You
                  </div>
                </div>
              )}

              {/* Call Status */}
              <div className="absolute top-4 left-4 bg-gray-800 rounded-lg p-2">
                <p className="text-white text-sm">{callStatus}</p>
              </div>

              {/* Remote Users Info */}
              {remoteUsers.length > 0 && (
                <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-2">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <Users className="w-4 h-4" />
                    <span>{remoteUsers.length} in call</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-center gap-4">
              <button
                onClick={handleToggleMute}
                className={`p-4 rounded-full cursor-pointer transition ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`p-4 rounded-full cursor-pointer transition ${
                  !isVideoEnabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              <button
                onClick={handleEndCall}
                disabled={endingCall}
                className="bg-red-600 hover:bg-red-700 cursor-pointer text-white px-8 py-4 rounded-full transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endingCall ? (
                  <div className="w-6 h-6">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <PhoneOff className="w-6 h-6" />
                )}
                {endingCall ? 'Ending...' : 'End Call'}
              </button>
            </div>

            {/* Debug Information */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Agora Debug Info:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700 dark:text-blue-300">
                <div>
                  <strong>Connection:</strong> <span className="font-mono">{debugInfo.connectionState}</span>
                </div>
                <div>
                  <strong>Joined:</strong> <span className="font-mono">{debugInfo.joinState ? '✅ YES' : '❌ NO'}</span>
                </div>
                <div>
                  <strong>Remote Users:</strong> <span className="font-mono">{debugInfo.remoteUsersCount}</span>
                </div>
                <div>
                  <strong>Microphone:</strong> <span className="font-mono">{debugInfo.isMuted ? '🔇 MUTED' : '🎤 ACTIVE'}</span>
                </div>
                <div>
                  <strong>Camera:</strong> <span className="font-mono">{debugInfo.isVideoEnabled ? '📹 ON' : '📷 OFF'}</span>
                </div>
                <div>
                  <strong>Local Video:</strong> <span className="font-mono">{debugInfo.localVideoTrack ? '✅' : '❌'}</span>
                </div>
                <div>
                  <strong>Remote Videos:</strong> <span className="font-mono">{debugInfo.remoteVideoTracks}</span>
                </div>
                <div>
                  <strong>Channel:</strong> <span className="font-mono text-xs">{debugInfo.channelName || 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <Video className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Active Video Call
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Start a video call with another user to get started
            </p>
            <button
              onClick={() => setShowNewCallDialog(true)}
              className="bg-primary-600 hover:bg-primary-700 cursor-pointer text-white px-8 py-3 rounded-lg transition font-medium inline-flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              Start Video Call
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
          title="Start Video Call"
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
                  {searchQuery ? 'No users found' : 'Search for users to start a video call'}
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
                        <Video className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
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

export default VideoCallPage;