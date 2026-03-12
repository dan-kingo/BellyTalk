import api from "./api";
import {
  DoctorDirectoryItem,
  DoctorProfile,
  DoctorService,
  DoctorServiceAvailability,
} from "../types";

interface ListDoctorsOptions {
  page?: number;
  limit?: number;
  specialty?: string;
}

interface PresenceDoctor {
  id: string;
  full_name: string;
  status: "online" | "offline" | "away";
  last_seen: string | null;
}

export const doctorDiscoveryService = {
  async getDoctorsPresence(doctorIds: string[]): Promise<PresenceDoctor[]> {
    if (!doctorIds.length) {
      return [];
    }

    const response = await api.get("/presence/doctors", {
      params: { ids: doctorIds.join(",") },
    });

    return (response.data.doctors || []) as PresenceDoctor[];
  },

  async listDoctors(options: ListDoctorsOptions = {}) {
    const response = await api.get("/doctors", {
      params: {
        page: options.page ?? 1,
        limit: options.limit ?? 24,
        verification_status: "approved",
        specialty: options.specialty || undefined,
      },
    });

    const doctors = (response.data.doctors || []) as DoctorProfile[];
    if (!doctors.length) {
      return [] as DoctorDirectoryItem[];
    }

    const ids = doctors.map((doctor) => doctor.user_id).filter(Boolean);

    try {
      const presenceDoctors = await this.getDoctorsPresence(ids);
      const presenceMap = new Map(
        presenceDoctors.map((item) => [item.id, item]),
      );

      return doctors.map((doctor) => {
        const presence = presenceMap.get(doctor.user_id);
        return {
          ...doctor,
          full_name: presence?.full_name,
          status: (presence?.status || "offline") as
            | "online"
            | "offline"
            | "away",
          last_seen: presence?.last_seen ?? null,
        };
      });
    } catch {
      return doctors.map((doctor) => ({
        ...doctor,
        status: "offline" as const,
        last_seen: null,
      }));
    }
  },

  async getDoctorProfile(doctorId: string): Promise<DoctorProfile> {
    const response = await api.get(`/doctors/${doctorId}`);
    return response.data.doctor as DoctorProfile;
  },

  async getDoctorServices(doctorId: string): Promise<DoctorService[]> {
    const response = await api.get("/doctor-services", {
      params: {
        doctor_id: doctorId,
        page: 1,
        limit: 50,
      },
    });
    return (response.data.services || []) as DoctorService[];
  },

  async getServiceAvailability(
    serviceId: string,
  ): Promise<DoctorServiceAvailability[]> {
    const response = await api.get(
      `/doctor-services/${serviceId}/availability`,
    );
    return (response.data.availability || []) as DoctorServiceAvailability[];
  },
};
