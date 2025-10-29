export type UserRole = 'mother' | 'counselor' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: string;
  aud: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  language: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  role_status?: string;
  extra?: any;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
