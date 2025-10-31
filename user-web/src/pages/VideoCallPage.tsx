import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { videoService } from '../services/video.service';
import { chatService } from '../services/chat.service';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Video, Mic, MicOff, PhoneOff, Search, Camera, CameraOff } from 'lucide-react';
import { Profile } from '../types';

const VideoCallPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('');
  const [endingCall, setEndingCall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  const handleStartCall = async (receiverId: string) => {
    try {
      setLoading(true);
      setErrorMessage('');
      setCallStatus('Initiating video call...');

      const session = await videoService.createSession(receiverId);
      setCurrentSession(session.session);

      setCallStatus('Getting video token...');
      await videoService.getToken(session.session.id, undefined, 'host', user?.email);

      setCallStatus('Connecting to video room...');

      await new Promise(resolve => setTimeout(resolve, 500));

      setInCall(true);
      setShowNewCallDialog(false);
      setCallStatus('Connected');
    } catch (error: any) {
      console.error('Failed to start video call:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to start video call. Please try again.';
      setErrorMessage(errorMsg);
      setCallStatus('');
      setInCall(false);
      setCurrentSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    try {
      setEndingCall(true);
      if (currentSession) {
        await videoService.endSession(currentSession.id);
      }
      setInCall(false);
      setCurrentSession(null);
      setCallStatus('');
      setVideoEnabled(true);
      setMuted(false);
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      setEndingCall(false);
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Call</h1>
          </div>
          {!inCall && (
            <button
              onClick={() => setShowNewCallDialog(true)}
              className="flex items-center gap-2 cursor-pointer bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition font-medium"
            >
              <Video className="w-5 h-5" />
              Start Video Call
            </button>
          )}
        </div>

        {inCall ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
              {videoEnabled ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Video Stream Area</p>
                    <p className="text-gray-500 text-sm mt-2">
                      In production, this would show the video feed
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CameraOff className="w-24 h-24 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">Camera is off</p>
                </div>
              )}

              <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-2">
                <p className="text-white text-sm">{callStatus}</p>
              </div>

              <div className="absolute bottom-4 left-4 w-48 h-36 bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-xl mx-auto mb-2">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-white text-xs">You</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full cursor-pointer transition ${
                  muted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full cursor-pointer transition ${
                  !videoEnabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {videoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              <button
                onClick={handleEndCall}
                disabled={endingCall}
                className="bg-red-600 hover:bg-red-700 cursor-pointer text-white px-8 py-4 rounded-full transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endingCall ? (
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <PhoneOff className="w-6 h-6" />
                )}
                {endingCall ? 'Ending...' : 'End Call'}
              </button>
            </div>

            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-t border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-800 dark:text-primary-200 text-center">
                Video calling is integrated with 100ms. In production, this would connect to a real video room with camera and microphone access.
              </p>
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
                      onClick={() => handleStartCall(userProfile.id)}
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
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-primary-400 shrink-0"></div>
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
