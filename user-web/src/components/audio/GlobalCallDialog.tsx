// src/components/audio/GlobalCallDialog.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IncomingCallDialog } from './IncomingCallDialog';

export const GlobalCallDialog: React.FC = () => {
  const navigate = useNavigate();

  const handleCallAccepted = (session: any) => {
    console.log('📞 Call accepted globally:', session);
    
    if (session.isVideoCall) {
      // Navigate to video call page
      navigate('/video-call', {
        state: {
          session: session,
          isIncomingCall: true,
          caller: session.initiator,
          autoJoin: true
        },
        replace: true
      });
    } else {
      // Navigate to audio call page
      navigate('/audio-call', {
        state: {
          session: session,
          isIncomingCall: true,
          caller: session.initiator,
          autoJoin: true
        },
        replace: true
      });
    }
  };

  const handleCallRejected = (sessionId: string) => {
    console.log('📞 Call rejected globally:', sessionId);
    // You can add any global rejection logic here
  };

  return (
    <IncomingCallDialog
      onCallAccepted={handleCallAccepted}
      onCallRejected={handleCallRejected}
    />
  );
};