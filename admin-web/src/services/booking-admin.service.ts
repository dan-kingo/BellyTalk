import api from "./api";
import {
  AdminBookingQueueItem,
  AdminBookingQueueMetrics,
  BookingDetail,
} from "../types";

export type QueueQuery = {
  page?: number;
  limit?: number;
  doctor_id?: string;
  service_mode?: "video" | "audio" | "message" | "in_person";
  date?: string;
};

const buildQuery = (query: QueueQuery = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

export const bookingAdminService = {
  async getQueueMetrics(query: QueueQuery = {}) {
    const qs = buildQuery(query);
    const response = await api.get(
      `/bookings/admin/queue/metrics${qs ? `?${qs}` : ""}`,
    );
    return response.data as { date: string; metrics: AdminBookingQueueMetrics };
  },

  async listPendingConfirmations(query: QueueQuery = {}) {
    const qs = buildQuery(query);
    const response = await api.get(
      `/bookings/admin/queue/pending-confirmations${qs ? `?${qs}` : ""}`,
    );
    return response.data as {
      queue: AdminBookingQueueItem[];
      page: number;
      total: number;
    };
  },

  async listPendingPaymentReviews(query: QueueQuery = {}) {
    const qs = buildQuery(query);
    const response = await api.get(
      `/bookings/admin/queue/pending-payment-reviews${qs ? `?${qs}` : ""}`,
    );
    return response.data as {
      queue: AdminBookingQueueItem[];
      page: number;
      total: number;
    };
  },

  async listTodayQueue(query: QueueQuery = {}) {
    const qs = buildQuery(query);
    const response = await api.get(
      `/bookings/admin/queue/today${qs ? `?${qs}` : ""}`,
    );
    return response.data as {
      queue: AdminBookingQueueItem[];
      page: number;
      total: number;
      date: string;
    };
  },

  async confirmBooking(id: string, note?: string) {
    const response = await api.patch(`/bookings/${id}/confirm`, {
      note: note || "Confirmed by admin",
    });
    return response.data;
  },

  async cancelBooking(id: string, reason?: string) {
    const response = await api.patch(`/bookings/${id}/cancel`, {
      reason: reason || "Cancelled by admin",
    });
    return response.data;
  },

  async completeBooking(id: string, note?: string) {
    const response = await api.patch(`/bookings/${id}/complete`, {
      note: note || "Completed by admin",
    });
    return response.data;
  },

  async markNoShow(id: string, note?: string) {
    const response = await api.patch(`/bookings/${id}/no-show`, {
      note: note || "Marked no-show by admin",
    });
    return response.data;
  },

  async reviewPayment(
    bookingId: string,
    paymentId: string,
    status: "approved" | "rejected",
    rejection_reason?: string,
  ) {
    const response = await api.patch(
      `/bookings/${bookingId}/payments/${paymentId}/review`,
      {
        status,
        rejection_reason,
      },
    );
    return response.data;
  },

  async getBookingDetails(bookingId: string) {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data as { booking: BookingDetail };
  },
};
