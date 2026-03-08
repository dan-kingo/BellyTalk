import { create } from "zustand";
import { hospitalService } from "../services/hospital.service";
import { Hospital } from "../types";

type HospitalFilters = {
  city?: string;
  service?: string;
  query?: string;
  page?: number;
  limit?: number;
};

type HospitalStore = {
  hospitals: Hospital[];
  loading: boolean;
  error: string | null;
  currentKey: string;
  lastFetched: Record<string, number | null>;
  requests: Record<string, Promise<void> | null>;
  lastParams: { canManage: boolean; filters: HospitalFilters } | null;
  fetchHospitals: (
    canManage: boolean,
    filters?: HospitalFilters,
    force?: boolean,
  ) => Promise<void>;
  createHospital: (data: Partial<Hospital>) => Promise<void>;
  updateHospital: (id: string, data: Partial<Hospital>) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  clearError: () => void;
};

const STALE_TIME_MS = 60_000;

const buildKey = (canManage: boolean, filters?: HospitalFilters) => {
  const mode = canManage ? "my" : "all";
  const query = filters?.query?.trim() || "";
  const city = filters?.city?.trim() || "";
  const service = filters?.service?.trim() || "";
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 10;
  return `${mode}|${query}|${city}|${service}|${page}|${limit}`;
};

const sanitizeFilters = (filters?: HospitalFilters): HospitalFilters => {
  return Object.fromEntries(
    Object.entries(filters || {}).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  ) as HospitalFilters;
};

export const useHospitalStore = create<HospitalStore>((set, get) => ({
  hospitals: [],
  loading: false,
  error: null,
  currentKey: "",
  lastFetched: {},
  requests: {},
  lastParams: null,

  fetchHospitals: async (canManage, filters = {}, force = false) => {
    const state = get();
    const cleanFilters = sanitizeFilters(filters);
    const key = buildKey(canManage, cleanFilters);
    const request = state.requests[key];

    if (request) {
      return request;
    }

    const lastFetchedAt = state.lastFetched[key] ?? null;
    const isFresh =
      lastFetchedAt !== null && Date.now() - lastFetchedAt < STALE_TIME_MS;
    const hasCachedData =
      state.currentKey === key && state.hospitals.length > 0;

    if (!force && isFresh && hasCachedData) {
      return;
    }

    const pending = (async () => {
      set({ loading: true, error: null });
      try {
        const response = canManage
          ? await hospitalService.getMyHospitals(cleanFilters)
          : await hospitalService.getHospitals(cleanFilters);

        set((current) => ({
          hospitals: response.data || [],
          loading: false,
          currentKey: key,
          lastParams: { canManage, filters: cleanFilters },
          lastFetched: {
            ...current.lastFetched,
            [key]: Date.now(),
          },
        }));
      } catch (error) {
        console.error("Failed to load hospitals:", error);
        set({ loading: false, error: "Failed to load hospitals" });
        throw error;
      } finally {
        set((current) => ({
          requests: {
            ...current.requests,
            [key]: null,
          },
        }));
      }
    })();

    set((current) => ({
      requests: {
        ...current.requests,
        [key]: pending,
      },
    }));

    return pending;
  },

  createHospital: async (data) => {
    set({ error: null });
    try {
      await hospitalService.createHospital(data);
      const lastParams = get().lastParams;
      if (lastParams) {
        await get().fetchHospitals(
          lastParams.canManage,
          lastParams.filters,
          true,
        );
      }
    } catch (error) {
      console.error("Failed to create hospital:", error);
      set({ error: "Failed to create hospital" });
      throw error;
    }
  },

  updateHospital: async (id, data) => {
    set({ error: null });
    try {
      await hospitalService.updateHospital(id, data);
      const lastParams = get().lastParams;
      if (lastParams) {
        await get().fetchHospitals(
          lastParams.canManage,
          lastParams.filters,
          true,
        );
      }
    } catch (error) {
      console.error("Failed to update hospital:", error);
      set({ error: "Failed to update hospital" });
      throw error;
    }
  },

  deleteHospital: async (id) => {
    set({ error: null });
    try {
      await hospitalService.deleteHospital(id);
      set((state) => ({
        hospitals: state.hospitals.filter((hospital) => hospital.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete hospital:", error);
      set({ error: "Failed to delete hospital" });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
