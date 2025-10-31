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

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock: number;
  created_by?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  products?: Product;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}


export interface Order {
  id: string;
  user_id: string;
  total_price: number;
  payment_status: 'pending' | 'paid' | 'failed';
  order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_intent_id?: string;
  shipping_address: ShippingAddress;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_owner_id: string;
  products?: {
    title: string;
    image_url: string;
    price: number;
    created_by: string;
  };
}

export interface ShippingAddress {
  address: string;
  city: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface CreateOrderData {
  shipping_address: ShippingAddress;
  notes?: string;
}
export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  participant_a_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
  participant_b_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  seen: boolean;
  metadata?: any;
  created_at: string;
}

export interface VideoSession {
  id: string;
  initiator_id: string;
  receiver_id: string;
  room_id: string;
  token?: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  summary?: string;
  created_at: string;
}

export interface AudioSession {
  id: string;
  initiator_id: string;
  receiver_id: string;
  room_id: string;
  token?: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  summary?: string;
  created_at: string;
}
