// src/contexts/HMSContext.tsx
import React from 'react';
import { 
  HMSRoomProvider, 
  useHMSActions, 
  useHMSStore, 
  selectPeers, 
  selectIsConnectedToRoom, 
  selectLocalPeer, 
  selectIsLocalAudioEnabled 
} from '@100mslive/react-sdk';

// Main provider component
export const HMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HMSRoomProvider>
      {children}
    </HMSRoomProvider>
  );
};

// Custom hook to access HMS actions and store
export const useHMS = () => {
  const hmsActions = useHMSActions();
  
  return {
    hmsActions,
    // Note: useHMSStore is a hook, not a function to call
  };
};

// Hook for HMS state
export const useHMSState = () => {
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);

  return {
    isConnected,
    localPeer,
    peers,
    isLocalAudioEnabled
  };
};