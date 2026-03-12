import api from "./api";
import {
  DoctorService,
  DoctorServiceAvailability,
  DoctorServiceMode,
} from "../types";

interface UpsertDoctorServicePayload {
  title: string;
  description?: string;
  service_mode: DoctorServiceMode;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  booking_buffer_minutes?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

interface CreateAvailabilityPayload {
  day_of_week?: number;
  specific_date?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  slot_capacity?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export const doctorServiceService = {
  async listMyServices(): Promise<DoctorService[]> {
    const response = await api.get("/doctor-services/my", {
      params: { page: 1, limit: 100 },
    });
    return (response.data.services || []) as DoctorService[];
  },

  async createService(
    payload: UpsertDoctorServicePayload,
  ): Promise<DoctorService> {
    const response = await api.post("/doctor-services", payload);
    return response.data.service as DoctorService;
  },

  async updateService(
    serviceId: string,
    payload: Partial<UpsertDoctorServicePayload>,
  ): Promise<DoctorService> {
    const response = await api.put(`/doctor-services/${serviceId}`, payload);
    return response.data.service as DoctorService;
  },

  async deleteService(serviceId: string): Promise<void> {
    await api.delete(`/doctor-services/${serviceId}`);
  },

  async listServiceAvailability(
    serviceId: string,
  ): Promise<DoctorServiceAvailability[]> {
    const response = await api.get(
      `/doctor-services/${serviceId}/availability`,
    );
    return (response.data.availability || []) as DoctorServiceAvailability[];
  },

  async createServiceAvailability(
    serviceId: string,
    payload: CreateAvailabilityPayload,
  ): Promise<DoctorServiceAvailability> {
    const response = await api.post(
      `/doctor-services/${serviceId}/availability`,
      payload,
    );
    return response.data.availability as DoctorServiceAvailability;
  },
};
