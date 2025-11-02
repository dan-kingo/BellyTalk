import React, { createContext, useContext, ReactNode } from 'react';
import { HMSReactiveStore } from '@100mslive/hms-video-store';

// Initialize HMS store
const hmsManager = new HMSReactiveStore();
const hmsActions = hmsManager.getHMSActions();
const hmsStore = hmsManager.getStore();

interface HMSContextType {
  hmsActions: any;
  hmsStore: any;
}

const HMSContext = createContext<HMSContextType | null>(null);

interface HMSProviderProps {
  children: ReactNode;
}

export const HMSProvider: React.FC<HMSProviderProps> = ({ children }) => {
  return (
    <HMSContext.Provider value={{ hmsActions, hmsStore }}>
      {children}
    </HMSContext.Provider>
  );
};

export const useHMS = () => {
  const context = useContext(HMSContext);
  if (!context) {
    throw new Error('useHMS must be used within an HMSProvider');
  }
  return context;
};