// Update your existing AudioCallPage component
import React, { useState, useEffect } from "react";
import { useAgora } from "../contexts/AgoraContext";
import { audioService } from "../services/audio.service";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useChatStore } from "../stores/chat.store";
import Layout from "../components/layout/Layout";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Dialog from "../components/common/Dialog";
import Skeleton from "../components/common/Skeleton";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Search,
  User,
  Users,
} from "lucide-react";
import { Profile } from "../types";
import { useLocation, useNavigate } from "react-router-dom";

type CallHistoryItem = {
  id: string;
  call_type: "audio" | "video";
  status: string;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  direction: "incoming" | "outgoing";
  counterpart?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  } | null;
};

type CallTarget = {
  id: string;
  full_name: string;
  email: string;
};

const AudioCallPage: React.FC = () => {
  const {
    join,
    leave,
    mute,
    joinState,
    remoteUsers,
    isMuted,
    connectionState,
  } = useAgora();

  const { user } = useAuth();
  const searchUsersList = useChatStore((state) => state.searchUsersList);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>("");
  const [endingCall, setEndingCall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [remoteUser, setRemoteUser] = useState<CallTarget | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ringCountdown, setRingCountdown] = useState<number | null>(null);

  const APP_ID = import.meta.env.VITE_AGORA_APP_ID!;
  const isIncomingCallView = Boolean(location.state?.isIncomingCall);

  const loadCallHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await audioService.getHistory(20);
      setHistory(response.sessions || []);
    } catch (error) {
      console.error("Failed to load audio call history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadCallHistory();
  }, []);

  const getDisplayStatus = (item: CallHistoryItem) => {
    if (
      !item.started_at &&
      (item.status === "pending" || item.status === "ended")
    ) {
      return "missed";
    }
    return item.status;
  };

  const getStatusChipClass = (status: string) => {
    if (status === "active") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
    if (status === "ended") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }
    if (status === "missed") {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  const formatDuration = (item: CallHistoryItem) => {
    if (!item.started_at) return "-";
    const start = new Date(item.started_at).getTime();
    const end = item.ended_at ? new Date(item.ended_at).getTime() : Date.now();
    const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const formatRingCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    if (
      !joinState ||
      !currentSession ||
      isIncomingCallView ||
      remoteUsers.length > 0
    ) {
      return;
    }

    setCallStatus(`Ringing... ${formatRingCountdown(ringCountdown ?? 45)}`);
  }, [
    joinState,
    currentSession,
    isIncomingCallView,
    remoteUsers.length,
    ringCountdown,
  ]);

  useEffect(() => {
    if (
      !joinState ||
      !currentSession ||
      isIncomingCallView ||
      remoteUsers.length > 0
    ) {
      return;
    }

    if (ringCountdown === null) {
      setRingCountdown(45);
      return;
    }

    if (ringCountdown <= 0) {
      const autoEndNoAnswer = async () => {
        try {
          await leave();
          await audioService.endSession(currentSession.id);
          setCurrentSession(null);
          setRemoteUser(null);
          setCallStatus("No answer. Call ended.");
          loadCallHistory();
        } catch (error) {
          console.error("Failed to auto-end unanswered audio call:", error);
          setCallStatus("Failed to end unanswered call");
        }
      };

      void autoEndNoAnswer();
      return;
    }

    const timeout = setTimeout(() => {
      setRingCountdown((previous) => (previous === null ? null : previous - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    ringCountdown,
    joinState,
    currentSession,
    isIncomingCallView,
    remoteUsers.length,
    leave,
  ]);

  useEffect(() => {
    if (remoteUsers.length > 0 && joinState) {
      setRingCountdown(null);
      setCallStatus("Connected to call");
    }
  }, [remoteUsers.length, joinState]);

  // Auto-join incoming audio calls
  useEffect(() => {
    if (
      location.state?.isIncomingCall &&
      location.state?.autoJoin &&
      !currentSession &&
      !joinState
    ) {
      const { session, caller } = location.state;
      console.log("🎵 AUTO-JOINING incoming audio call:", { session, caller });

      // Set the session and remote user
      setCurrentSession(session);
      setRemoteUser(caller);

      // Automatically join the audio call
      handleJoinIncomingCall(session);

      // Clear the autoJoin flag to prevent re-joining
      navigate("/audio-call", {
        state: {
          ...location.state,
          autoJoin: false,
        },
        replace: true,
      });
    }
  }, [location.state, currentSession, joinState, navigate]);

  // Keep caller and receiver in sync on end/reject by watching current session directly.
  useEffect(() => {
    if (!currentSession?.id || !user?.id) return;

    const channel = supabase
      .channel(`audio-session-${currentSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "audio_sessions",
          filter: `id=eq.${currentSession.id}`,
        },
        async (payload) => {
          const updatedSession = payload.new as any;
          if (updatedSession.status !== "ended") return;

          try {
            if (joinState) {
              await leave();
            }
          } catch (error) {
            console.error(
              "Failed leaving audio channel after end event:",
              error,
            );
          }

          setCurrentSession(null);
          setRemoteUser(null);
          setRingCountdown(null);
          setCallStatus(
            updatedSession.started_at
              ? "Call ended by other user"
              : "Call was rejected",
          );
          loadCallHistory();

          setTimeout(() => {
            setCallStatus("");
          }, 3000);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentSession?.id, user?.id, joinState, leave]);

  // Handle browser/tab closing
  useEffect(() => {
    const handleBeforeUnload = async (_: BeforeUnloadEvent) => {
      if (currentSession && joinState) {
        console.log("🔄 Ending audio call due to page unload...");

        // End the session when user leaves the page
        try {
          await audioService.endSession(currentSession.id);
        } catch (error) {
          console.error("Error ending audio session on unload:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
      sessionStatus: currentSession?.status,
    });
  }, [connectionState, joinState, remoteUsers, isMuted, currentSession]);

  // Add this useEffect to debug UID issues
  useEffect(() => {
    if (currentSession) {
      console.log("🔍 CURRENT SESSION DEBUG:", {
        sessionId: currentSession.id,
        sessionUid: currentSession.uid,
        channel: currentSession.channel_name,
        status: currentSession.status,
      });
    }
  }, [currentSession]);

  // Function to handle joining incoming calls
  const handleJoinIncomingCall = async (session: any) => {
    try {
      setLoading(true);
      setCallStatus("Joining audio call...");

      console.log("🎯 RECEIVER accepting call:", {
        sessionId: session.id,
        sessionUid: session.uid,
        channel: session.channel_name,
      });

      // Get tokens for the session
      const authResponse = await audioService.getTokens(session.id);

      console.log("✅ Auth tokens received for RECEIVER:", {
        channelName: authResponse.channelName,
        receiverUid: authResponse.uid,
        initiatorUid: session.uid,
        differentUIDs: authResponse.uid !== session.uid,
      });

      // Join the Agora channel with RECEIVER's UID
      const joinConfig = {
        appId: APP_ID || "c9b0a43d50a947a38c8ba06c6ffec555",
        channel: authResponse.channelName,
        token: authResponse.rtcToken,
        uid: authResponse.uid,
      };

      console.log("🔗 RECEIVER joining Agora channel:", joinConfig);
      await join(joinConfig);

      setCallStatus("Connected to call");
      console.log(
        "✅ Receiver joined successfully with UID:",
        authResponse.uid,
      );
    } catch (error: any) {
      console.error("❌ Failed to join incoming call:", error);
      setErrorMessage(
        error.response?.data?.error || error.message || "Failed to join call",
      );
      setCallStatus("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);

    try {
      setSearching(true);
      const users = await searchUsersList(query);
      setSearchResults(users);
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenNewCallDialog = async () => {
    setShowNewCallDialog(true);
    setErrorMessage("");
    setSearchQuery("");

    try {
      setSearching(true);
      const users = await searchUsersList("");
      setSearchResults(users);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleStartCall = async (
    receiverId: string,
    userProfile: CallTarget,
  ) => {
    try {
      setLoading(true);
      setErrorMessage("");
      setCallStatus("Creating session...");
      setRemoteUser(userProfile);

      console.log("🚀 Starting audio call process...");

      // 1. Create session with Agora
      setCallStatus("Creating audio session...");
      const sessionResponse = await audioService.createSession(receiverId);
      setCurrentSession(sessionResponse.session);

      console.log("✅ Session created:", {
        sessionId: sessionResponse.session.id,
        initiatorUid: sessionResponse.session.uid,
        channel: sessionResponse.session.channel_name,
      });

      setCallStatus("Getting auth tokens...");

      // 2. Get auth tokens from backend
      const authResponse = await audioService.getTokens(
        sessionResponse.session.id,
        undefined,
        "publisher",
      );

      console.log("✅ Auth tokens received for CALLER:", {
        channelName: authResponse.channelName,
        uid: authResponse.uid,
        shouldMatchSession: authResponse.uid === sessionResponse.session.uid,
      });

      setCallStatus("Joining audio channel...");

      // 3. Join the Agora channel
      const joinConfig = {
        appId: APP_ID || "c9b0a43d50a947a38c8ba06c6ffec555",
        channel: authResponse.channelName,
        token: authResponse.rtcToken,
        uid: authResponse.uid,
      };

      console.log("🔗 CALLER joining Agora channel:", joinConfig);
      await join(joinConfig);

      console.log("✅ Caller joined successfully with UID:", authResponse.uid);
      setRingCountdown(45);
      setCallStatus("Ringing... 00:45");
      setShowNewCallDialog(false);
    } catch (error: any) {
      console.error("❌ Failed to start call:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to start audio call. Please try again.";
      setErrorMessage(errorMsg);
      setCallStatus("");
      setRemoteUser(null);
      setRingCountdown(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRedialFromHistory = (item: CallHistoryItem) => {
    if (!item.counterpart?.id || loading || joinState) return;
    void handleStartCall(item.counterpart.id, {
      id: item.counterpart.id,
      full_name: item.counterpart.full_name,
      email: item.counterpart.email,
    });
  };

  const handleEndCall = async () => {
    console.log("🔍 END CALL DEBUG:", {
      current_user: user?.id, // From useAuth()
      current_session_id: currentSession.id,
      session_initiator: currentSession.initiator_id,
      session_receiver: currentSession.receiver_id,
      user_is_participant:
        user?.id === currentSession.initiator_id ||
        user?.id === currentSession.receiver_id,
    });
    try {
      setEndingCall(true);
      setCallStatus("Ending call for both users...");

      console.log("🛑 Ending audio call for both users...");

      // Leave the Agora channel
      await leave();

      // End session in backend - this will trigger WebSocket update to other user
      if (currentSession) {
        await audioService.endSession(currentSession.id);
      }

      setCurrentSession(null);
      setCallStatus("Call ended");
      setRemoteUser(null);
      setRingCountdown(null);

      console.log("✅ Audio call ended successfully for both users");

      // Clear call status after 3 seconds
      setTimeout(() => {
        setCallStatus("");
      }, 3000);

      loadCallHistory();
    } catch (error) {
      console.error("❌ Failed to end call:", error);
      setCallStatus("Failed to end call");
    } finally {
      setEndingCall(false);
    }
  };

  const toggleMute = async () => {
    try {
      console.log("🔇 Toggling mute:", !isMuted);
      await mute(!isMuted);
    } catch (error) {
      console.error("❌ Failed to toggle mute:", error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap mb-8">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Audio Call
            </h1>
          </div>
          {!joinState && !callStatus && (
            <button
              onClick={handleOpenNewCallDialog}
              className="bg-primary-600 hover:bg-primary-700 cursor-pointer text-white px-5 py-2.5 rounded-lg transition font-medium inline-flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Start Audio Call
            </button>
          )}
        </div>

        {!joinState && callStatus && (
          <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            {callStatus}
          </div>
        )}

        {joinState ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center mb-6">
                <User className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Audio Call in Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {callStatus}
              </p>

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
                    {remoteUsers.length} participant
                    {remoteUsers.length > 1 ? "s" : ""} in call
                  </div>
                ) : (
                  "Waiting for other participants..."
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full cursor-pointer transition ${
                  isMuted
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
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
              {endingCall ? "Ending..." : "End Call"}
            </button>

            {/* Debug Information */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">
                Agora Debug Info:
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <div>
                  Connection State:{" "}
                  <span className="font-mono">{debugInfo.connectionState}</span>
                </div>
                <div>
                  Joined:{" "}
                  <span className="font-mono">
                    {debugInfo.joinState ? "✅ YES" : "❌ NO"}
                  </span>
                </div>
                <div>
                  Remote Users:{" "}
                  <span className="font-mono">
                    {debugInfo.remoteUsersCount}
                  </span>
                </div>
                <div>
                  Microphone:{" "}
                  <span className="font-mono">
                    {debugInfo.isMuted ? "🔇 MUTED" : "🎤 ACTIVE"}
                  </span>
                </div>
                <div>
                  Session ID:{" "}
                  <span className="font-mono">
                    {debugInfo.currentSession || "None"}
                  </span>
                </div>
                <div>
                  Session Status:{" "}
                  <span className="font-mono">
                    {debugInfo.sessionStatus || "None"}
                  </span>
                </div>
                <div>
                  Channel:{" "}
                  <span className="font-mono">
                    {debugInfo.channelName || "None"}
                  </span>
                </div>
                <div>
                  Real Agora Connection:{" "}
                  <span className="font-mono">
                    {joinState ? "✅ YES" : "❌ NO"}
                  </span>
                </div>
                <div>
                  Auto-Join Status:{" "}
                  <span className="font-mono">
                    {location.state?.autoJoin ? "🔄 PENDING" : "✅ DONE"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Existing New Call Dialog remains the same */}
        <Dialog
          isOpen={showNewCallDialog}
          onClose={() => {
            if (!loading) {
              setShowNewCallDialog(false);
              setSearchQuery("");
              setSearchResults([]);
              setErrorMessage("");
            }
          }}
          title="Start Audio Call"
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {errorMessage}
                </p>
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
                <div className="space-y-2 py-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? "No users found"
                    : "No users available right now"}
                </div>
              ) : (
                <div className="space-y-2">
                  {!searchQuery && (
                    <p className="px-1 pb-1 text-xs text-gray-500 dark:text-gray-400">
                      Tap a user to start an audio call
                    </p>
                  )}
                  {searchResults.map((userProfile) => (
                    <button
                      key={userProfile.id}
                      onClick={() =>
                        handleStartCall(userProfile.id, userProfile)
                      }
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

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Audio Call History
            </h2>
            <button
              onClick={loadCallHistory}
              className="text-sm text-primary dark:text-secondary hover:underline"
            >
              Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-1/3" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="mt-2">
                    <Skeleton className="h-7 w-24 rounded-md ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 py-2">
              No audio calls yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleRedialFromHistory(item)}
                  className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                    item.counterpart?.id && !joinState
                      ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      : "cursor-default"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.counterpart?.full_name || "Unknown user"}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {item.direction}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusChipClass(
                          getDisplayStatus(item),
                        )}`}
                      >
                        {getDisplayStatus(item)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Duration: {formatDuration(item)}</span>
                    <span>
                      Date: {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  {item.counterpart?.id && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-xs text-primary dark:text-secondary">
                        Tap to call again
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRedialFromHistory(item);
                        }}
                        disabled={loading || joinState}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary dark:text-secondary hover:bg-primary/10 dark:hover:bg-secondary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Phone className="w-3 h-3" />
                        Call Again
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AudioCallPage;
