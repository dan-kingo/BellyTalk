export type UserRole = "mother" | "counselor" | "doctor" | "admin";

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

export interface DoctorProfile {
  user_id: string;
  headline?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  years_of_experience?: number;
  hospital_affiliation?: string;
  verification_status?: "pending" | "approved" | "rejected";
  metadata?: Record<string, any>;
  updated_at?: string;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile | null>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role?: "mother" | "doctor",
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

export type DoctorServiceMode = "video" | "audio" | "message" | "in_person";
export type BookingPaymentMethod = "cod" | "proof_upload";
export type BookingStatus =
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export interface DoctorDirectoryItem extends DoctorProfile {
  full_name?: string;
  status?: "online" | "offline" | "away";
  last_seen?: string | null;
}

export interface DoctorService {
  id: string;
  doctor_id: string;
  title: string;
  description?: string;
  service_mode: DoctorServiceMode;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  booking_buffer_minutes?: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorServiceAvailability {
  id: string;
  service_id: string;
  doctor_id: string;
  day_of_week?: number | null;
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  timezone?: string;
  slot_capacity?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface DoctorServiceSlot {
  slot_key: string;
  availability_id: string;
  service_id: string;
  doctor_id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  slot_capacity: number;
  booked_count: number;
  remaining: number;
}

export interface Booking {
  id: string;
  mother_id: string;
  doctor_id: string;
  service_id: string;
  availability_id?: string | null;
  service_mode: DoctorServiceMode;
  payment_method: BookingPaymentMethod;
  payment_status?: string;
  status: BookingStatus;
  service_title_snapshot: string;
  service_description_snapshot?: string;
  service_price_snapshot: number;
  currency: string;
  scheduled_start: string;
  scheduled_end: string;
  patient_age?: number | null;
  symptoms?: string | null;
  booking_notes?: string | null;
  created_at: string;
  updated_at?: string;
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
  payment_status:
    | "pending"
    | "pending_review"
    | "unpaid"
    | "paid"
    | "rejected"
    | "failed";
  order_status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_method?: "cod" | "proof_upload";
  payment_document_url?: string | null;
  payment_reference?: string | null;
  payment_submitted_at?: string | null;
  payment_reviewed_at?: string | null;
  payment_rejection_reason?: string | null;
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
  zipCode?: string;
  postal_code?: string;
  region?: string;
  country: string;
  phone?: string;
}

export interface CreateOrderData {
  shipping_address: ShippingAddress;
  notes?: string;
  payment_method: "cod" | "proof_upload";
  payment_document_url?: string;
  transaction_reference?: string;
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

export interface GroupRoom {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export interface GroupMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
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
