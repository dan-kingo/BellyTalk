import { create } from "zustand";
import { contentService } from "../services/content.service";
import { hospitalService } from "../services/hospital.service";
import { shopService } from "../services/shop.service";
import { Content, Hospital, Product } from "../types";

type DashboardStore = {
  previewProducts: Product[];
  previewContents: Content[];
  previewHospitals: Hospital[];
  loading: boolean;
  error: string | null;
  lastFetched: Record<string, number | null>;
  requests: Record<string, Promise<void> | null>;
  currentKey: string;
  fetchDashboardData: (
    canManageContent: boolean,
    canManageHospitals: boolean,
    force?: boolean,
  ) => Promise<void>;
  clearError: () => void;
};

const STALE_TIME_MS = 60_000;

const getKey = (canManageContent: boolean, canManageHospitals: boolean) => {
  return `${canManageContent ? "my-content" : "all-content"}|${canManageHospitals ? "my-hospitals" : "all-hospitals"}`;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  previewProducts: [],
  previewContents: [],
  previewHospitals: [],
  loading: false,
  error: null,
  lastFetched: {},
  requests: {},
  currentKey: "",

  fetchDashboardData: async (
    canManageContent,
    canManageHospitals,
    force = false,
  ) => {
    const state = get();
    const key = getKey(canManageContent, canManageHospitals);
    const inFlight = state.requests[key];

    if (inFlight) {
      return inFlight;
    }

    const lastFetchedAt = state.lastFetched[key] ?? null;
    const isFresh =
      lastFetchedAt !== null && Date.now() - lastFetchedAt < STALE_TIME_MS;
    const hasCachedData =
      state.currentKey === key &&
      (state.previewProducts.length > 0 ||
        state.previewContents.length > 0 ||
        state.previewHospitals.length > 0);

    if (!force && isFresh && hasCachedData) {
      return;
    }

    const request = (async () => {
      set({ loading: true, error: null });
      try {
        const [productsRes, contentRes, hospitalRes] = await Promise.all([
          shopService.getProducts({ page: 1, limit: 6 }),
          canManageContent
            ? contentService.getMyContents({ limit: 6 })
            : contentService.getAllContent({ limit: 6 }),
          canManageHospitals
            ? hospitalService.getMyHospitals({ limit: 6 })
            : hospitalService.getHospitals({ limit: 6 }),
        ]);

        set((current) => ({
          previewProducts: productsRes.products || [],
          previewContents: contentRes.data || [],
          previewHospitals: hospitalRes.data || [],
          loading: false,
          currentKey: key,
          lastFetched: {
            ...current.lastFetched,
            [key]: Date.now(),
          },
        }));
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        set({ loading: false, error: "Failed to load dashboard data" });
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
        [key]: request,
      },
    }));

    return request;
  },

  clearError: () => set({ error: null }),
}));
