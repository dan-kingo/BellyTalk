import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  IMicrophoneAudioTrack 
} from 'agora-rtc-sdk-ng';

interface AgoraContextType {
  client: IAgoraRTCClient | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  joinState: boolean;
  remoteUsers: IAgoraRTCRemoteUser[];
  join: (config: JoinConfig) => Promise<void>;
  leave: () => Promise<void>;
  mute: (muted: boolean) => Promise<void>;
  isMuted: boolean;
  connectionState: string;
}

interface JoinConfig {
  appId: string;
  channel: string;
  token: string;
  uid?: string | number;
}

const AgoraContext = createContext<AgoraContextType | null>(null);

// Agora SDK configuration
AgoraRTC.setLogLevel(2); // DEBUG level logging

export const AgoraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const [joinState, setJoinState] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');

  console.log('🔧 AgoraProvider initialized');

  // Initialize Agora client
  useEffect(() => {
    console.log('🚀 Initializing Agora RTC client...');
    
    try {
      // Create client instance
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      
      clientRef.current = client;
      console.log('✅ Agora RTC client created successfully');

      // Set up event listeners
      const handleUserPublished = async (
        user: IAgoraRTCRemoteUser, 
        mediaType: 'audio' | 'video'
      ) => {
        console.log('📢 User published:', { 
          uid: user.uid, 
          mediaType,
          hasAudio: user.hasAudio,
          hasVideo: user.hasVideo
        });

        await client.subscribe(user, mediaType);
        console.log('✅ Subscribed to remote user:', user.uid);

        if (mediaType === 'audio') {
          user.audioTrack?.play();
          console.log('🎵 Playing remote audio track for user:', user.uid);
        }

        setRemoteUsers(prev => {
          const exists = prev.find(u => u.uid === user.uid);
          return exists ? prev : [...prev, user];
        });
      };

      const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
        console.log('📵 User unpublished:', user.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      };

      const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
        console.log('👤 User joined:', { 
          uid: user.uid,
          remoteUsersCount: remoteUsers.length + 1
        });
        setRemoteUsers(prev => {
          const exists = prev.find(u => u.uid === user.uid);
          return exists ? prev : [...prev, user];
        });
      };

      const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
        console.log('👋 User left:', user.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      };

      const handleConnectionStateChange = (state: string) => {
        console.log('🔄 Connection state changed:', state);
        setConnectionState(state);
      };

      // Register event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-joined', handleUserJoined);
      client.on('user-left', handleUserLeft);
      client.on('connection-state-change', handleConnectionStateChange);

      console.log('✅ Agora event listeners registered');

      return () => {
        console.log('🧹 Cleaning up Agora client...');
        client.off('user-published', handleUserPublished);
        client.off('user-unpublished', handleUserUnpublished);
        client.off('user-joined', handleUserJoined);
        client.off('user-left', handleUserLeft);
        client.off('connection-state-change', handleConnectionStateChange);
      };
    } catch (error) {
      console.error('❌ Failed to initialize Agora RTC client:', error);
    }
  }, []);

  const join = async (config: JoinConfig) => {
    console.log('🎯 Joining Agora channel:', config);
    
    if (!clientRef.current) {
      throw new Error('Agora client not initialized');
    }

    try {
      setJoinState(true);
      
      // Join the channel
      console.log('🔗 Joining channel...', {
        appId: config.appId,
        channel: config.channel,
        token: config.token ? 'PRESENT' : 'MISSING',
        uid: config.uid
      });

      const uid = await clientRef.current.join(
        config.appId,
        config.channel,
        config.token,
        config.uid
      );

      console.log('✅ Successfully joined channel:', { uid, channel: config.channel });

      // Create and publish local audio track
      console.log('🎤 Creating local audio track...');
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;

      console.log('📢 Publishing local audio track...');
      await clientRef.current.publish([localAudioTrack]);
      
      console.log('✅ Local audio track published successfully');
      setJoinState(true);
      setIsMuted(false);

    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      setJoinState(false);
      throw error;
    }
  };

  const leave = async () => {
    console.log('🚪 Leaving Agora channel...');
    
    if (!clientRef.current) {
      console.warn('⚠️ No Agora client to leave from');
      return;
    }

    try {
      // Stop and close local tracks
      if (localAudioTrackRef.current) {
        console.log('🔇 Stopping local audio track...');
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      // Leave the channel
      console.log('👋 Leaving channel...');
      await clientRef.current.leave();
      
      setJoinState(false);
      setRemoteUsers([]);
      setIsMuted(false);
      
      console.log('✅ Successfully left channel');
    } catch (error) {
      console.error('❌ Error leaving channel:', error);
      throw error;
    }
  };

  const mute = async (muted: boolean) => {
    console.log('🔇 Setting mute state:', muted);
    
    if (!localAudioTrackRef.current) {
      console.warn('⚠️ No local audio track to mute');
      return;
    }

    try {
      await localAudioTrackRef.current.setEnabled(!muted);
      setIsMuted(muted);
      console.log('✅ Mute state updated:', muted);
    } catch (error) {
      console.error('❌ Failed to set mute state:', error);
      throw error;
    }
  };

  const value: AgoraContextType = {
    client: clientRef.current,
    localAudioTrack: localAudioTrackRef.current,
    joinState,
    remoteUsers,
    join,
    leave,
    mute,
    isMuted,
    connectionState
  };

  return (
    <AgoraContext.Provider value={value}>
      {children}
    </AgoraContext.Provider>
  );
};

export const useAgora = () => {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error('useAgora must be used within an AgoraProvider');
  }
  return context;
};