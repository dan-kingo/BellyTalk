// src/components/audio/IncomingCallDialog.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { audioService } from '../../services/audio.service';
import { webSocketService } from '../../services/websocket.service';
import Dialog from '../common/Dialog';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Profile } from '../../types';

interface IncomingCallDialogProps {
  onCallAccepted: (session: any) => void;
  onCallRejected: (sessionId: string) => void;
}

interface IncomingCall {
  session: any;
  caller: Profile;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  onCallAccepted,
  onCallRejected
}) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const handleIncomingCall = async (payload: any) => {
      if (!mounted) return;

      const session = payload.new;
      
      // Only show for new pending sessions
      if (payload.eventType === 'INSERT' && session.status === 'pending') {
        console.log('📞 New incoming call received:', session);
        
        try {
          // Fetch caller details
          const sessionDetails = await audioService.getSession(session.id);
          const caller = sessionDetails.session.initiator;
          
          if (mounted) {
            setIncomingCall({
              session: sessionDetails.session,
              caller
            });
            setIsVisible(true);
          }
        } catch (error) {
          console.error('❌ Failed to fetch caller details:', error);
        }
      }
      
      // Handle call cancellation
      if (payload.eventType === 'UPDATE' && payload.new.status === 'ended') {
        if (mounted && incomingCall?.session.id === payload.new.id) {
          setIncomingCall(null);
          setIsVisible(false);
        }
      }
    };

    // Subscribe to incoming calls
    webSocketService.subscribeToIncomingCalls(user.id, handleIncomingCall);

    return () => {
      mounted = false;
      webSocketService.unsubscribe();
    };
  }, [user?.id]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      setIsResponding(true);
      console.log('✅ Accepting call:', incomingCall.session.id);
      
      // Update session status to active
      await audioService.getTokens(incomingCall.session.id);
      
      setIsVisible(false);
      onCallAccepted(incomingCall.session);
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
    } finally {
      setIsResponding(false);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      setIsResponding(true);
      console.log('❌ Rejecting call:', incomingCall.session.id);
      
      // End the session
      await audioService.endSession(incomingCall.session.id);
      
      setIsVisible(false);
      onCallRejected(incomingCall.session.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('❌ Failed to reject call:', error);
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

  return (
    <Dialog
      isOpen={isVisible}
      onClose={handleClose}
      title="Incoming Audio Call"
    >
      <div className="text-center p-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-br from-green-500 to-blue-500 flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-white" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {incomingCall.caller.full_name}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {incomingCall.caller.email}
        </p>
        
        <p className="text-lg font-semibold text-primary-600 dark:text-primary-400 mb-6">
          is calling you...
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleRejectCall}
            disabled={isResponding}
            className="bg-red-600 hover:bg-red-700 cursor-pointer text-white p-4 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleAcceptCall}
            disabled={isResponding}
            className="bg-green-600 hover:bg-green-700 cursor-pointer text-white p-4 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {isResponding ? 'Connecting...' : 'Accept or reject the call'}
        </div>
      </div>
    </Dialog>
  );
};