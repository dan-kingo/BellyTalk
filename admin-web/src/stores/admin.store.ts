import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { adminService } from "../services/admin.service";
import { contentService } from "../services/content.service";
import { hospitalService } from "../services/hospital.service";
import {
  Content,
  Hospital,
  OverviewStats,
  Profile,
  RoleRequest,
} from "../types";

type ContentFilters = {
  query?: string;
  lang?: string;
  page?: number;
  limit?: number;
};
type HospitalFilters = {
  city?: string;
  service?: string;
  query?: string;
  page?: number;
  limit?: number;
};

const normalizeFilters = (filters: Record<string, unknown>) => {
  const cleanEntries = Object.entries(filters)
    .filter(
      ([, value]) => value !== "" && value !== undefined && value !== null,
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(cleanEntries);
};

const buildKey = (scope: string, filters: Record<string, unknown>) => {
  return `${scope}:${JSON.stringify(normalizeFilters(filters))}`;
};

export const buildContentKey = (filters: ContentFilters, canManage: boolean) =>
  buildKey(canManage ? "my-content" : "all-content", filters);

export const buildHospitalKey = (
  filters: HospitalFilters,
  canManage: boolean,
) => buildKey(canManage ? "my-hospitals" : "all-hospitals", filters);

interface AdminStoreState {
  overview: OverviewStats | null;
  overviewLoaded: boolean;
  overviewLoading: boolean;
  overviewError: string;

  users: Profile[];
  usersLoaded: boolean;
  usersLoading: boolean;
  usersError: string;

  roleRequests: RoleRequest[];
  roleRequestsLoaded: boolean;
  roleRequestsLoading: boolean;
  roleRequestsError: string;

  contentByKey: Record<string, Content[]>;
  contentLoadedByKey: Record<string, boolean>;
  contentLoadingByKey: Record<string, boolean>;
  contentErrorByKey: Record<string, string>;

  hospitalsByKey: Record<string, Hospital[]>;
  hospitalsLoadedByKey: Record<string, boolean>;
  hospitalsLoadingByKey: Record<string, boolean>;
  hospitalsErrorByKey: Record<string, string>;

  fetchUsers: (force?: boolean) => Promise<void>;
  removeUserFromCache: (userId: string) => void;
  invalidateOverview: () => void;
  clearAdminCache: () => void;

  fetchOverview: (force?: boolean) => Promise<void>;

  fetchRoleRequests: (force?: boolean) => Promise<void>;
  removeRoleRequestFromCache: (userId: string) => void;

  fetchContents: (
    filters: ContentFilters,
    canManage: boolean,
    force?: boolean,
  ) => Promise<void>;
  fetchHospitals: (
    filters: HospitalFilters,
    canManage: boolean,
    force?: boolean,
  ) => Promise<void>;
}

export const useAdminStore = create<AdminStoreState>()(
  persist(
    (set, get) => ({
      overview: null,
      overviewLoaded: false,
      overviewLoading: false,
      overviewError: "",

      users: [],
      usersLoaded: false,
      usersLoading: false,
      usersError: "",

      roleRequests: [],
      roleRequestsLoaded: false,
      roleRequestsLoading: false,
      roleRequestsError: "",

      contentByKey: {},
      contentLoadedByKey: {},
      contentLoadingByKey: {},
      contentErrorByKey: {},

      hospitalsByKey: {},
      hospitalsLoadedByKey: {},
      hospitalsLoadingByKey: {},
      hospitalsErrorByKey: {},

      fetchOverview: async (force = false) => {
        const { overviewLoaded, overviewLoading } = get();

        if (!force && (overviewLoaded || overviewLoading)) {
          return;
        }

        set({ overviewLoading: true, overviewError: "" });

        try {
          const data = await adminService.getOverview();
          set({
            overview: data || null,
            overviewLoaded: true,
            overviewLoading: false,
            overviewError: "",
          });
        } catch (error: any) {
          set({
            overviewLoading: false,
            overviewError:
              error?.response?.data?.error || "Failed to load overview",
          });
        }
      },

      fetchUsers: async (force = false) => {
        const { usersLoaded, usersLoading } = get();

        if (!force && (usersLoaded || usersLoading)) {
          return;
        }

        set({ usersLoading: true, usersError: "" });

        try {
          const data = await adminService.listUsers();
          set({
            users: data.users || [],
            usersLoaded: true,
            usersLoading: false,
            usersError: "",
          });
        } catch (error: any) {
          set({
            usersLoading: false,
            usersError: error?.response?.data?.error || "Failed to load users",
          });
        }
      },

      removeUserFromCache: (userId: string) => {
        set((state) => ({
          users: state.users.filter((user) => user.id !== userId),
        }));
      },

      invalidateOverview: () => {
        set({
          overviewLoaded: false,
          overviewError: "",
        });
      },

      clearAdminCache: () => {
        set({
          overview: null,
          overviewLoaded: false,
          overviewLoading: false,
          overviewError: "",
          users: [],
          usersLoaded: false,
          usersLoading: false,
          usersError: "",
          roleRequests: [],
          roleRequestsLoaded: false,
          roleRequestsLoading: false,
          roleRequestsError: "",
          contentByKey: {},
          contentLoadedByKey: {},
          contentLoadingByKey: {},
          contentErrorByKey: {},
          hospitalsByKey: {},
          hospitalsLoadedByKey: {},
          hospitalsLoadingByKey: {},
          hospitalsErrorByKey: {},
        });
      },

      fetchRoleRequests: async (force = false) => {
        const { roleRequestsLoaded, roleRequestsLoading } = get();

        if (!force && (roleRequestsLoaded || roleRequestsLoading)) {
          return;
        }

        set({ roleRequestsLoading: true, roleRequestsError: "" });

        try {
          const data = await adminService.listRoleRequests();
          set({
            roleRequests: data.requests || [],
            roleRequestsLoaded: true,
            roleRequestsLoading: false,
            roleRequestsError: "",
          });
        } catch (error: any) {
          set({
            roleRequestsLoading: false,
            roleRequestsError:
              error?.response?.data?.error || "Failed to load role requests",
          });
        }
      },

      removeRoleRequestFromCache: (userId: string) => {
        set((state) => ({
          roleRequests: state.roleRequests.filter(
            (request) => request.id !== userId,
          ),
        }));
      },

      fetchContents: async (filters, canManage, force = false) => {
        const key = buildContentKey(filters, canManage);
        const state = get();
        const isLoaded = state.contentLoadedByKey[key];
        const isLoading = state.contentLoadingByKey[key];

        if (!force && (isLoaded || isLoading)) {
          return;
        }

        set((current) => ({
          contentLoadingByKey: { ...current.contentLoadingByKey, [key]: true },
          contentErrorByKey: { ...current.contentErrorByKey, [key]: "" },
        }));

        try {
          const response = canManage
            ? await contentService.getMyContents(
                normalizeFilters(filters) as ContentFilters,
              )
            : await contentService.getAllContent(
                normalizeFilters(filters) as ContentFilters,
              );

          set((current) => ({
            contentByKey: {
              ...current.contentByKey,
              [key]: response.data || [],
            },
            contentLoadedByKey: { ...current.contentLoadedByKey, [key]: true },
            contentLoadingByKey: {
              ...current.contentLoadingByKey,
              [key]: false,
            },
            contentErrorByKey: { ...current.contentErrorByKey, [key]: "" },
          }));
        } catch (error: any) {
          set((current) => ({
            contentLoadingByKey: {
              ...current.contentLoadingByKey,
              [key]: false,
            },
            contentErrorByKey: {
              ...current.contentErrorByKey,
              [key]: error?.response?.data?.error || "Failed to load content",
            },
          }));
        }
      },

      fetchHospitals: async (filters, canManage, force = false) => {
        const key = buildHospitalKey(filters, canManage);
        const state = get();
        const isLoaded = state.hospitalsLoadedByKey[key];
        const isLoading = state.hospitalsLoadingByKey[key];

        if (!force && (isLoaded || isLoading)) {
          return;
        }

        set((current) => ({
          hospitalsLoadingByKey: {
            ...current.hospitalsLoadingByKey,
            [key]: true,
          },
          hospitalsErrorByKey: { ...current.hospitalsErrorByKey, [key]: "" },
        }));

        try {
          const response = canManage
            ? await hospitalService.getMyHospitals(
                normalizeFilters(filters) as HospitalFilters,
              )
            : await hospitalService.getHospitals(
                normalizeFilters(filters) as HospitalFilters,
              );

          set((current) => ({
            hospitalsByKey: {
              ...current.hospitalsByKey,
              [key]: response.data || [],
            },
            hospitalsLoadedByKey: {
              ...current.hospitalsLoadedByKey,
              [key]: true,
            },
            hospitalsLoadingByKey: {
              ...current.hospitalsLoadingByKey,
              [key]: false,
            },
            hospitalsErrorByKey: { ...current.hospitalsErrorByKey, [key]: "" },
          }));
        } catch (error: any) {
          set((current) => ({
            hospitalsLoadingByKey: {
              ...current.hospitalsLoadingByKey,
              [key]: false,
            },
            hospitalsErrorByKey: {
              ...current.hospitalsErrorByKey,
              [key]: error?.response?.data?.error || "Failed to load hospitals",
            },
          }));
        }
      },
    }),
    {
      name: "admin-zustand-cache",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        overview: state.overview,
        overviewLoaded: state.overviewLoaded,
        users: state.users,
        usersLoaded: state.usersLoaded,
        roleRequests: state.roleRequests,
        roleRequestsLoaded: state.roleRequestsLoaded,
        contentByKey: state.contentByKey,
        contentLoadedByKey: state.contentLoadedByKey,
        hospitalsByKey: state.hospitalsByKey,
        hospitalsLoadedByKey: state.hospitalsLoadedByKey,
      }),
    },
  ),
);
