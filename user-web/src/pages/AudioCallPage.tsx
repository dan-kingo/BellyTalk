import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { audioService } from '../services/audio.service';
import { chatService } from '../services/chat.service';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Dialog from '../components/common/Dialog';
import { Phone, PhoneOff, Mic, MicOff, Search } from 'lucide-react';
import { Profile } from '../types';

const AudioCallPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
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
      setCallStatus('Initiating call...');

      const session = await audioService.createSession(receiverId);
      setCurrentSession(session.session);

      setCallStatus('Getting audio token...');
      await audioService.getToken(session.session.id, undefined, 'host', user?.email);

      setCallStatus('Connecting to audio room...');

      await new Promise(resolve => setTimeout(resolve, 500));

      setInCall(true);
      setShowNewCallDialog(false);
      setCallStatus('Connected');
    } catch (error: any) {
      console.error('Failed to start call:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to start audio call. Please try again.';
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
        await audioService.endSession(currentSession.id);
      }
      setInCall(false);
      setCurrentSession(null);
      setCallStatus('');
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audio Call</h1>
          </div>
          {!inCall && (
            <button
              onClick={() => setShowNewCallDialog(true)}
              className="flex items-center gap-2 cursor-pointer bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition font-medium"
            >
              <Phone className="w-5 h-5" />
              Start Audio Call
            </button>
          )}
        </div>

        {inCall ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center mb-6">
                <Phone className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Audio Call in Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{callStatus}</p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
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
            </div>

            <button
              onClick={handleEndCall}
              disabled={endingCall}
              className="bg-red-600 hover:bg-red-700 cursor-pointer text-white px-8 py-3 rounded-lg transition font-medium flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {endingCall ? (
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PhoneOff className="w-5 h-5" />
              )}
              {endingCall ? 'Ending...' : 'End Call'}
            </button>

            <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <p className="text-sm text-primary-800 dark:text-primary-200">
                Audio calling is integrated with 100ms. In production, this would connect to a real audio room.
              </p>
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
