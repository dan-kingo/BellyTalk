export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
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
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface RoleRequest {
  id: string;
  full_name: string;
  email: string;
  requested_role: string;
  documents: string[];
  submitted_at: string;
}

export interface OverviewStats {
  users: number;
  contents: number;
  messages: number;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  method: string;
  path: string;
  timestamp: string;
}


export interface Content {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: string;
  tags?: string[];
  language: string;
  cover_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  description?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  services?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

