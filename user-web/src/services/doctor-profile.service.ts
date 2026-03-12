import api from "./api";
import { DoctorProfile } from "../types";

export const doctorProfileService = {
  async getMyDoctorProfile(): Promise<DoctorProfile> {
    const response = await api.get("/doctors/me");
    return response.data.doctor;
  },

  async upsertMyDoctorProfile(payload: Partial<DoctorProfile>) {
    const response = await api.put("/doctors/me", payload);
    return response.data.doctor as DoctorProfile;
  },

  async uploadVerificationDocument(file: File, userId: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", `bellytalk/doctor-verification/${userId}`);

    const response = await api.post("/uploads/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data?.result;
  },
};
