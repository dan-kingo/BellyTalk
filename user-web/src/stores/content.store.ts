import { create } from "zustand";
import { contentService } from "../services/content.service";
import { Content } from "../types";

type ContentFilters = {
  query?: string;
  lang?: string;
  page?: number;
  limit?: number;
};

type ContentStore = {
  contents: Content[];
  loading: boolean;
  error: string | null;
  currentKey: string;
  lastFetched: Record<string, number | null>;
  requests: Record<string, Promise<void> | null>;
  lastParams: { canManage: boolean; filters: ContentFilters } | null;
  fetchContents: (
    canManage: boolean,
    filters?: ContentFilters,
    force?: boolean,
  ) => Promise<void>;
  createContent: (data: FormData) => Promise<void>;
  updateContent: (id: string, data: Partial<Content>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  clearError: () => void;
};

const STALE_TIME_MS = 60_000;

const buildKey = (canManage: boolean, filters?: ContentFilters) => {
  const mode = canManage ? "my" : "all";
  const query = filters?.query?.trim() || "";
  const lang = filters?.lang?.trim() || "";
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 10;
  return `${mode}|${query}|${lang}|${page}|${limit}`;
};

const sanitizeFilters = (filters?: ContentFilters): ContentFilters => {
  return Object.fromEntries(
    Object.entries(filters || {}).filter(
      ([, value]) => value !== "" && value !== undefined,
    ),
  ) as ContentFilters;
};

export const useContentStore = create<ContentStore>((set, get) => ({
  contents: [],
  loading: false,
  error: null,
  currentKey: "",
  lastFetched: {},
  requests: {},
  lastParams: null,

  fetchContents: async (canManage, filters = {}, force = false) => {
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
    const hasCachedData = state.currentKey === key && state.contents.length > 0;

    if (!force && isFresh && hasCachedData) {
      return;
    }

    const pending = (async () => {
      set({ loading: true, error: null });
      try {
        const response = canManage
          ? await contentService.getMyContents(cleanFilters)
          : await contentService.getAllContent(cleanFilters);

        set((current) => ({
          contents: response.data || [],
          loading: false,
          currentKey: key,
          lastParams: { canManage, filters: cleanFilters },
          lastFetched: {
            ...current.lastFetched,
            [key]: Date.now(),
          },
        }));
      } catch (error) {
        console.error("Failed to load content:", error);
        set({ loading: false, error: "Failed to load content" });
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

  createContent: async (data) => {
    set({ error: null });
    try {
      await contentService.createContent(data);
      const lastParams = get().lastParams;
      if (lastParams) {
        await get().fetchContents(
          lastParams.canManage,
          lastParams.filters,
          true,
        );
      }
    } catch (error) {
      console.error("Failed to create content:", error);
      set({ error: "Failed to create content" });
      throw error;
    }
  },

  updateContent: async (id, data) => {
    set({ error: null });
    try {
      await contentService.updateContent(id, data);
      const lastParams = get().lastParams;
      if (lastParams) {
        await get().fetchContents(
          lastParams.canManage,
          lastParams.filters,
          true,
        );
      }
    } catch (error) {
      console.error("Failed to update content:", error);
      set({ error: "Failed to update content" });
      throw error;
    }
  },

  deleteContent: async (id) => {
    set({ error: null });
    try {
      await contentService.deleteContent(id);
      set((state) => ({
        contents: state.contents.filter((content) => content.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete content:", error);
      set({ error: "Failed to delete content" });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
