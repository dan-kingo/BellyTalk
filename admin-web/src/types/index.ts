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

export interface OverviewStats {
  users: number;
  contents: number;
  hospitals: number;
  messages: number;
  timestamp: string;
}

export interface ProviderApproval extends Profile {
  extra?: {
    requested_role?: string;
    documents?: string[];
    verification_documents?: string[];
    rejection_reason?: string | null;
    [key: string]: any;
  };
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

export interface BookingParticipantProfile {
  id: string;
  full_name: string;
  email: string;
}

export interface BookingPaymentProof {
  id: string;
  booking_id: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  transaction_reference?: string;
  proof_document_id?: string;
  status?: string;
  created_at?: string;
}

export interface AdminBookingQueueItem {
  id: string;
  mother_id: string;
  doctor_id: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  service_mode?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at?: string;
  mother_profile?: BookingParticipantProfile | null;
  doctor_profile?: BookingParticipantProfile | null;
  pending_payment?: BookingPaymentProof | null;
}

export interface AdminBookingQueueMetrics {
  pending_confirmations: number;
  pending_payment_reviews: number;
  todays_bookings: number;
  overdue_confirmations: number;
}

export interface BookingDocument {
  id: string;
  document_type: string;
  file_url: string;
  file_name?: string;
  created_at?: string;
}

export interface BookingDetail {
  id: string;
  booking_documents?: BookingDocument[];
  booking_payments?: Array<{
    id: string;
    transaction_reference?: string;
    proof_document_id?: string;
    amount?: number;
    currency?: string;
    status?: string;
    created_at?: string;
  }>;
}
