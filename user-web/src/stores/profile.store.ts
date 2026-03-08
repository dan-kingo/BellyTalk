import { create } from "zustand";
import { profileService } from "../services/profile.service";

type ProfileStore = {
  loading: boolean;
  error: string | null;
  updateProfile: (data: FormData) => Promise<void>;
  requestRoleUpgrade: (
    role: "doctor" | "counselor",
    files: File[],
  ) => Promise<void>;
  clearError: () => void;
};

export const useProfileStore = create<ProfileStore>((set) => ({
  loading: false,
  error: null,

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      await profileService.updateMe(data);
      set({ loading: false });
    } catch (error) {
      console.error("Failed to update profile:", error);
      set({ loading: false, error: "Failed to update profile" });
      throw error;
    }
  },

  requestRoleUpgrade: async (role, files) => {
    set({ loading: true, error: null });
    try {
      await profileService.requestRoleUpgrade(role, files);
      set({ loading: false });
    } catch (error) {
      console.error("Failed to submit role upgrade request:", error);
      set({ loading: false, error: "Failed to submit role upgrade request" });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
