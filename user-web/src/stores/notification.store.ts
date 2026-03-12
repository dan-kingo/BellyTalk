import { create } from "zustand";
import { bookingService } from "../services/booking.service";

type NotificationType =
  | "new_booking"
  | "upcoming_reminder"
  | "payment_proof_submitted";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  link: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  request: Promise<void> | null;
  fetchDoctorNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearError: () => void;
}

const STALE_TIME_MS = 20_000;
const SEEN_STORAGE_KEY = "doctor_notification_seen_ids";

const readSeenIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set<string>(parsed.filter((value) => typeof value === "string"));
  } catch {
    return new Set<string>();
  }
};

const writeSeenIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage errors and keep in-memory behavior.
  }
};

const buildNotifications = async (): Promise<AppNotification[]> => {
  const bookings = await bookingService.listDoctorBookings({
    type: "upcoming",
    limit: 100,
  });

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const paymentStatusesForProof = [
    "submitted",
    "pending_verification",
    "pending_review",
    "under_review",
  ];

  const items: AppNotification[] = [];

  bookings.forEach((booking) => {
    const startAt = new Date(booking.scheduled_start).getTime();
    const createdAt = booking.created_at || booking.scheduled_start;

    if (booking.status === "pending_confirmation") {
      items.push({
        id: `new_booking:${booking.id}`,
        type: "new_booking",
        title: "New booking request",
        message: `${booking.service_title_snapshot} on ${new Date(
          booking.scheduled_start,
        ).toLocaleString()}`,
        createdAt,
        link: "/doctor/bookings",
      });
    }

    if (
      booking.status === "confirmed" &&
      startAt > now &&
      startAt - now <= oneDayMs
    ) {
      items.push({
        id: `upcoming_reminder:${booking.id}`,
        type: "upcoming_reminder",
        title: "Upcoming consultation reminder",
        message: `${booking.service_title_snapshot} starts ${new Date(
          booking.scheduled_start,
        ).toLocaleString()}`,
        createdAt: booking.scheduled_start,
        link: "/doctor/bookings",
      });
    }

    const paymentStatus = String(booking.payment_status || "").toLowerCase();
    if (
      booking.payment_method === "proof_upload" &&
      paymentStatusesForProof.includes(paymentStatus)
    ) {
      items.push({
        id: `payment_proof_submitted:${booking.id}`,
        type: "payment_proof_submitted",
        title: "Payment proof submitted",
        message: `${booking.service_title_snapshot} has proof awaiting verification`,
        createdAt,
        link: "/doctor/bookings",
      });
    }
  });

  const seen = new Set<string>();
  const deduped: AppNotification[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  deduped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return deduped;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null,
  request: null,

  fetchDoctorNotifications: async (force = false) => {
    const state = get();

    if (state.request) {
      return state.request;
    }

    const isFresh =
      state.lastFetched !== null &&
      Date.now() - state.lastFetched < STALE_TIME_MS;
    if (!force && isFresh) {
      return;
    }

    const request = (async () => {
      set({ loading: true, error: null });
      try {
        const nextNotifications = await buildNotifications();
        const seenIds = readSeenIds();
        const unreadCount = nextNotifications.filter(
          (item) => !seenIds.has(item.id),
        ).length;

        set({
          notifications: nextNotifications,
          unreadCount,
          loading: false,
          lastFetched: Date.now(),
        });
      } catch (error) {
        console.error("Failed to load notifications:", error);
        set({
          loading: false,
          error: "Failed to load notifications",
          lastFetched: Date.now(),
        });
      } finally {
        set({ request: null });
      }
    })();

    set({ request });
    return request;
  },

  markAsRead: (id: string) => {
    const seenIds = readSeenIds();
    seenIds.add(id);
    writeSeenIds(seenIds);

    const unreadCount = get().notifications.filter(
      (item) => !seenIds.has(item.id),
    ).length;

    set({ unreadCount });
  },

  markAllAsRead: () => {
    const allIds = get().notifications.map((item) => item.id);
    const seenIds = readSeenIds();
    allIds.forEach((id) => seenIds.add(id));
    writeSeenIds(seenIds);
    set({ unreadCount: 0 });
  },

  clearError: () => set({ error: null }),
}));
