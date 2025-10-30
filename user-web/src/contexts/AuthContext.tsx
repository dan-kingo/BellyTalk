import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from '../services/auth.service';
import { AuthContextType, User, Profile, UserRole } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profileData = await authService.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    await refreshProfile();
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    await authService.register(email, password, fullName, role);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setProfile(null);
  };

 useEffect(() => {
  let mounted = true;

  const initAuth = async () => {
    try {
      // 🔹 1. Try Supabase session first
      let { data: { session } } = await supabase.auth.getSession();

      // 🔹 2. If no session, but local tokens exist, restore it manually
      if (!session) {
        const access_token = localStorage.getItem('access_token');
        const refresh_token = localStorage.getItem('refresh_token');

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) console.error('Error restoring session:', error);
          session = data?.session;
        }
      }

      // 🔹 3. Set user if session exists
      if (session && mounted) {
        setUser(session.user as User);
        await refreshProfile();
      } else if (mounted) {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      if (mounted) {
        setUser(null);
        setProfile(null);
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  initAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    (async () => {
      if (session) {
        localStorage.setItem('access_token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        setUser(session.user as User);
        await refreshProfile();
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setProfile(null);
      }
    })();
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
