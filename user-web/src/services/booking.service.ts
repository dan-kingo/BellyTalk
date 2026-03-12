import api from "./api";
import {
  Booking,
  BookingPaymentMethod,
  BookingStatus,
  DoctorServiceMode,
} from "../types";

interface ListBookingsOptions {
  page?: number;
  limit?: number;
  type?: "upcoming" | "past";
  status?: BookingStatus | "";
  service_mode?: DoctorServiceMode | "";
}

interface CreateBookingPayload {
  doctor_id?: string;
  service_id: string;
  availability_id?: string;
  payment_method: BookingPaymentMethod;
  scheduled_start: string;
  scheduled_end: string;
  patient_age?: number;
  symptoms?: string;
  booking_notes?: string;
}

export const bookingService = {
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const response = await api.post("/bookings", payload);
    return response.data.booking as Booking;
  },

  async listMyBookings(options: ListBookingsOptions = {}): Promise<Booking[]> {
    const response = await api.get("/bookings/my", {
      params: {
        page: options.page ?? 1,
        limit: options.limit ?? 30,
        type: options.type || undefined,
        status: options.status || undefined,
        service_mode: options.service_mode || undefined,
      },
    });

    return (response.data.bookings || []) as Booking[];
  },

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/cancel`, {
      reason: reason || undefined,
    });
    return response.data.booking as Booking;
  },

  async listDoctorBookings(
    options: ListBookingsOptions = {},
  ): Promise<Booking[]> {
    const response = await api.get("/bookings/doctor", {
      params: {
        page: options.page ?? 1,
        limit: options.limit ?? 30,
        type: options.type || undefined,
        status: options.status || undefined,
        service_mode: options.service_mode || undefined,
      },
    });

    return (response.data.bookings || []) as Booking[];
  },

  async getBooking(id: string): Promise<any> {
    const response = await api.get(`/bookings/${id}`);
    return response.data.booking;
  },

  async confirmBooking(id: string, note?: string): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/confirm`, {
      note: note || undefined,
    });
    return response.data.booking as Booking;
  },

  async completeBooking(id: string, note?: string): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/complete`, {
      note: note || undefined,
    });
    return response.data.booking as Booking;
  },

  async rescheduleBooking(
    id: string,
    scheduled_start: string,
    scheduled_end: string,
    note?: string,
  ): Promise<Booking> {
    const response = await api.patch(`/bookings/${id}/reschedule`, {
      scheduled_start,
      scheduled_end,
      note: note || undefined,
    });
    return response.data.booking as Booking;
  },
};
