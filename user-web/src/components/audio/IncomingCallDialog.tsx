// src/components/audio/IncomingCallDialog.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { audioService } from '../../services/audio.service';
import { videoService } from '../../services/video.service';
import { webSocketService } from '../../services/websocket.service';
import Dialog from '../common/Dialog';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Profile } from '../../types';
import { useNavigate } from 'react-router-dom';

interface IncomingCallDialogProps {
  onCallAccepted: (session: any) => void;
  onCallRejected: (sessionId: string) => void;
}

interface IncomingCall {
  session: any;
  caller: Partial<Profile>;
  isVideoCall: boolean;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  onCallAccepted,
  onCallRejected
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [callTimeout, setCallTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) {
      console.log('❌ No user ID available for WebSocket subscription');
      return;
    }

    console.log('🎯 Setting up WebSocket listener for user:', user.id);

    const handleIncomingCall = async (payload: any) => {
      console.log('📞 WebSocket event received:', payload);

      const session = payload.new;
      
      // Handle new incoming calls and existing pending calls
      if (session.status === 'pending') {
        console.log('🚨 INCOMING CALL!', session);
        
        try {
          console.log('🎯 Getting session details for:', session.id);
          const sessionDetails = await audioService.getSession(session.id);
          console.log('✅ Session details received:', sessionDetails);
          
          // Check if this is a video call
          const isVideoCall = sessionDetails.session.call_type === 'video';
          const caller = sessionDetails.session.initiator;
          
          console.log('👤 Caller details:', { caller, isVideoCall });
          
          // Clear any existing timeout
          if (callTimeout) {
            clearTimeout(callTimeout);
          }

          setIncomingCall({
            session: sessionDetails.session,
            caller,
            isVideoCall
          });
          setIsVisible(true);
          
          // Auto-dismiss after 45 seconds if not answered
          const timeout = setTimeout(() => {
            console.log('⏰ Auto-dismissing call after timeout');
            if (isVisible && incomingCall?.session.id === session.id) {
              handleRejectCall();
            }
          }, 45000);
          
          setCallTimeout(timeout);
          
        } catch (error: any) {
          console.error('❌ Failed to fetch session details:', error);
          
          // Fallback with basic data
          const isVideoCall = session.call_type === 'video';
          const basicCall: IncomingCall = {
            session: {
              ...session,
              initiator: {
                id: session.initiator_id,
                full_name: 'User',
                email: 'user@example.com'
              }
            },
            caller: {
              id: session.initiator_id,
              full_name: 'User',
              email: 'user@example.com'
            },
            isVideoCall
          };
          
          console.log('🔄 Using basic call data:', basicCall);
          setIncomingCall(basicCall);
          setIsVisible(true);
          
          // Auto-dismiss after 45 seconds if not answered
          const timeout = setTimeout(() => {
            console.log('⏰ Auto-dismissing call after timeout (fallback)');
            if (isVisible && basicCall.session.id === session.id) {
              handleRejectCall();
            }
          }, 45000);
          
          setCallTimeout(timeout);
        }
      }
      
      // Handle call cancellation by caller
      if (payload.eventType === 'UPDATE' && payload.new.status === 'ended') {
        console.log('📞 Call ended by caller:', payload.new.id);
        if (incomingCall?.session.id === payload.new.id) {
          setIncomingCall(null);
          setIsVisible(false);
          if (callTimeout) {
            clearTimeout(callTimeout);
          }
        }
      }
    };

    // Subscribe to incoming calls
    webSocketService.subscribeToIncomingCalls(user.id, handleIncomingCall);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket subscription in dialog');
      if (callTimeout) {
        clearTimeout(callTimeout);
      }
      webSocketService.removeCallback(handleIncomingCall);
    };
  }, [user?.id]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      setIsResponding(true);
      console.log('✅ Accepting call:', incomingCall.session.id);
      
      // Clear timeout
      if (callTimeout) {
        clearTimeout(callTimeout);
      }
      
      // CRITICAL FIX: For video calls, navigate directly to video page
      if (incomingCall.isVideoCall) {
        console.log('🎥 Accepting VIDEO call - navigating to video page');
        
        // Get tokens first
        await videoService.getTokens(incomingCall.session.id);
        
        // Navigate directly to video call page with session data
        setIsVisible(false);
        navigate('/video-call', { 
          state: { 
            session: incomingCall.session,
            isIncomingCall: true,
            caller: incomingCall.caller,
            autoJoin: true // Add this flag to auto-join
          }
        });
        
        // Don't call onCallAccepted for video calls - video page will handle it
        return;
      } else {
        // For audio calls, use the existing flow
        console.log('🎵 Accepting audio call');
        await audioService.getTokens(incomingCall.session.id);
        
        setIsVisible(false);
        onCallAccepted({
          ...incomingCall.session,
          isVideoCall: incomingCall.isVideoCall
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to accept call:', error);
      alert('Failed to accept call: ' + (error.message || 'Please try again.'));
    } finally {
      setIsResponding(false);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      setIsResponding(true);
      console.log('❌ Rejecting call:', incomingCall.session.id);
      
      // Clear timeout
      if (callTimeout) {
        clearTimeout(callTimeout);
      }
      
      // Use appropriate service based on call type
      if (incomingCall.isVideoCall) {
        await videoService.endSession(incomingCall.session.id);
      } else {
        await audioService.endSession(incomingCall.session.id);
      }
      
      setIsVisible(false);
      onCallRejected(incomingCall.session.id);
      setIncomingCall(null);
    } catch (error: any) {
      console.error('❌ Failed to reject call:', error);
      alert('Failed to reject call: ' + (error.message || 'Please try again.'));
    } finally {
      setIsResponding(false);
    }
  };

  const handleClose = () => {
    if (incomingCall && !isResponding) {
      handleRejectCall();
    }
  };

  if (!isVisible || !incomingCall) return null;

  const callType = incomingCall.isVideoCall ? 'Video' : 'Audio';
  const callIcon = incomingCall.isVideoCall ? 
    <Video className="w-10 h-10 text-white" /> : 
    <Phone className="w-10 h-10 text-white" />;
  
  const gradientClass = incomingCall.isVideoCall ? 
    'from-purple-500 to-pink-600' : 
    'from-green-500 to-blue-600';

  return (
    <Dialog
      isOpen={isVisible}
      onClose={handleClose}
      title={`Incoming ${callType} Call`}
    >
      <div className="text-center p-6">
        <div className="animate-pulse">
          <div className={`w-20 h-20 mx-auto rounded-full bg-linear-to-br ${gradientClass} flex items-center justify-center mb-4`}>
            {callIcon}
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {incomingCall.caller.full_name}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {incomingCall.caller.email}
        </p>
        
        <p className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-6">
          is {incomingCall.isVideoCall ? 'video' : 'audio'} calling you...
        </p>

        <div className="flex justify-center gap-6">
          <button
            onClick={handleRejectCall}
            disabled={isResponding}
            className="flex flex-col items-center gap-2 bg-red-600 hover:bg-red-700 cursor-pointer text-white p-4 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed min-w-20"
            title={`Reject ${callType} Call`}
          >
            <PhoneOff className="w-6 h-6" />
            <span className="text-xs">Reject</span>
          </button>
          
          <button
            onClick={handleAcceptCall}
            disabled={isResponding}
            className="flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 cursor-pointer text-white p-4 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed min-w-20"
            title={`Accept ${callType} Call`}
          >
            <Phone className="w-6 h-6" />
            <span className="text-xs">Accept</span>
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {isResponding ? 'Connecting...' : 'Ringring...'}
        </div>

        {/* Debug Info */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-left">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Call Type:</strong> {callType}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Session ID:</strong> {incomingCall.session.id}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Route:</strong> {incomingCall.isVideoCall ? 'Video Page' : 'Audio Page'}
          </p>
        </div>
      </div>
    </Dialog>
  );
};