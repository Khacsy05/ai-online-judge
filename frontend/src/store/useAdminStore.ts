import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getAdminStats, AdminStatsResponse } from "@/services/admin.service";
import { getClassList, ClassroomItem } from "@/services/classroom.service";
import { getSubmissions } from "@/services/submission.service";
import { getProblems, ProblemItem, PaginatedProblemsResponse } from "@/services/problem.service";
import { getUsers, UserItem, PaginatedUsersResponse, QueryUsersParams } from "@/services/user.service";
import { SubmissionListItem } from "@/types/submission";

interface AdminDashboardData {
  stats: AdminStatsResponse | null;
  classrooms: ClassroomItem[];
  recentSubmissions: SubmissionListItem[];
}

interface AdminState {
  // 1. Dashboard data
  dashboard: AdminDashboardData;
  loadingDashboard: boolean;
  refreshingDashboard: boolean;
  dashboardError: string | null;

  // 2. Classrooms list
  classrooms: ClassroomItem[];
  loadingClassrooms: boolean;
  classroomsError: string | null;

  // 3. Problems list
  problems: ProblemItem[];
  totalProblems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  loadingProblems: boolean;
  problemsError: string | null;
  problemsPageCache: Record<string, { items: ProblemItem[]; total: number; totalPages: number }>;

  // 4. Users list
  users: UserItem[];
  totalUsers: number;
  totalUserPages: number;
  currentUserPage: number;
  userPageSize: number;
  userSearchQuery: string;
  userRoleFilter: "ALL" | "STUDENT" | "ADMIN";
  userClassroomIdFilter: string;
  loadingUsers: boolean;
  usersError: string | null;
  usersPageCache: Record<string, { items: UserItem[]; total: number; totalPages: number }>;

  // 5. Admin Submissions list
  adminSubmissions: SubmissionListItem[];
  totalAdminSubmissions: number;
  totalAdminSubmissionPages: number;
  currentAdminSubmissionPage: number;
  adminSubmissionPageSize: number;
  adminSubmissionSearch: string;
  adminSubmissionStatusFilter: string;
  adminSubmissionLanguageFilter: string;
  adminSubmissionClassroomId: string;
  loadingAdminSubmissions: boolean;
  adminSubmissionsError: string | null;
  submissionsPageCache: Record<string, { items: SubmissionListItem[]; total: number; totalPages: number }>;
  isChangingClassroom: boolean;

  // Actions - Dashboard
  fetchDashboard: (force?: boolean) => Promise<void>;

  // Actions - Classrooms
  fetchClassrooms: (force?: boolean) => Promise<void>;
  setClassrooms: (data: ClassroomItem[]) => void;
  addClassroom: (item: ClassroomItem) => void;
  updateClassroomInList: (item: ClassroomItem) => void;
  removeClassroomFromList: (id: string) => void;

  // Actions - Problems
  fetchProblems: (params?: { page?: number; limit?: number; search?: string; force?: boolean }) => Promise<void>;
  setProblems: (data: ProblemItem[]) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearchQuery: (query: string) => void;
  addProblem: (item: ProblemItem) => void;
  updateProblemInList: (item: ProblemItem) => void;
  removeProblemFromList: (id: string) => void;

  // Actions - Users
  fetchUsers: (params?: { page?: number; limit?: number; search?: string; role?: "ALL" | "STUDENT" | "ADMIN"; classroomId?: string; force?: boolean }) => Promise<void>;
  setUsers: (data: UserItem[]) => void;
  setCurrentUserPage: (page: number) => void;
  setUserPageSize: (size: number) => void;
  setUserSearchQuery: (query: string) => void;
  setUserRoleFilter: (role: "ALL" | "STUDENT" | "ADMIN") => void;
  setUserClassroomIdFilter: (classroomId: string) => void;
  addUser: (item: UserItem) => void;
  updateUserInList: (item: UserItem) => void;
  removeUserFromList: (id: string) => void;

  // Actions - Admin Submissions
  fetchAdminSubmissions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    language?: string;
    classroomId?: string;
    force?: boolean;
  }) => Promise<void>;
  setAdminSubmissions: (data: SubmissionListItem[]) => void;
  setCurrentAdminSubmissionPage: (page: number) => void;
  setAdminSubmissionPageSize: (size: number) => void;
  setAdminSubmissionSearch: (search: string) => void;
  setAdminSubmissionStatusFilter: (status: string) => void;
  setAdminSubmissionLanguageFilter: (language: string) => void;
  setAdminSubmissionClassroomId: (classroomId: string) => void;
  updateAdminSubmissionRealtime: (event: {
    submissionId: string;
    status: any;
    totalScore: number;
    executionTimeMs?: number | null;
    memoryUsedKb?: number | null;
    feedback?: string | null;
  }) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_STATE = {
  dashboard: {
    stats: null,
    classrooms: [],
    recentSubmissions: [],
  },
  loadingDashboard: false,
  refreshingDashboard: false,
  dashboardError: null,

  classrooms: [],
  loadingClassrooms: false,
  classroomsError: null,

  problems: [],
  totalProblems: 0,
  totalPages: 1,
  currentPage: 1,
  pageSize: 8,
  searchQuery: "",
  loadingProblems: false,
  problemsError: null,
  problemsPageCache: {},

  users: [],
  totalUsers: 0,
  totalUserPages: 1,
  currentUserPage: 1,
  userPageSize: 10,
  userSearchQuery: "",
  userRoleFilter: "ALL" as const,
  userClassroomIdFilter: "",
  loadingUsers: false,
  usersError: null,
  usersPageCache: {},

  adminSubmissions: [],
  totalAdminSubmissions: 0,
  totalAdminSubmissionPages: 1,
  currentAdminSubmissionPage: 1,
  adminSubmissionPageSize: 10,
  adminSubmissionSearch: "",
  adminSubmissionStatusFilter: "ALL",
  adminSubmissionLanguageFilter: "ALL",
  adminSubmissionClassroomId: "",
  loadingAdminSubmissions: false,
  adminSubmissionsError: null,
  submissionsPageCache: {},
  isChangingClassroom: false,
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // ==================== DASHBOARD ====================
      fetchDashboard: async (force = false) => {
        const hasData = !!get().dashboard.stats;
        if (!hasData) {
          set({ loadingDashboard: true, dashboardError: null });
        } else if (force) {
          set({ refreshingDashboard: true, dashboardError: null });
        } else {
          // SWR: đã có cache thì không cần show loading spinner, chỉ cập nhật ngầm
          set({ dashboardError: null });
        }

        try {
          const [statsData, classData, subData] = await Promise.all([
            getAdminStats(),
            getClassList(),
            getSubmissions({ limit: 6 }),
          ]);

          set({
            dashboard: {
              stats: statsData,
              classrooms: Array.isArray(classData) ? classData : [],
              recentSubmissions: subData.data || [],
            },
            loadingDashboard: false,
            refreshingDashboard: false,
          });
        } catch (err: any) {
          console.error("Lỗi fetchDashboard:", err);
          set({
            dashboardError: err.message || "Lỗi tải dữ liệu dashboard",
            loadingDashboard: false,
            refreshingDashboard: false,
          });
        }
      },

      // ==================== CLASSROOMS ====================
      fetchClassrooms: async (force = false) => {
        const hasData = get().classrooms.length > 0;
        if (!hasData) {
          set({ loadingClassrooms: true, classroomsError: null });
        } else if (!force) {
          // Đã có data và không force: giữ data hiển thị ngay, load ngầm
          set({ classroomsError: null });
        }

        try {
          const data = await getClassList();
          const list = Array.isArray(data) ? data : [];
          set({ classrooms: list, loadingClassrooms: false });
        } catch (err: any) {
          console.error("Lỗi fetchClassrooms:", err);
          set({
            classroomsError: err.message || "Lỗi tải danh sách lớp học",
            loadingClassrooms: false,
          });
        }
      },

      setClassrooms: (data) => set({ classrooms: data }),
      addClassroom: (item) =>
        set((state) => ({ classrooms: [item, ...state.classrooms] })),
      updateClassroomInList: (item) =>
        set((state) => ({
          classrooms: state.classrooms.map((c) => (c.id === item.id ? { ...c, ...item } : c)),
        })),
      removeClassroomFromList: (id) =>
        set((state) => ({
          classrooms: state.classrooms.filter((c) => c.id !== id),
        })),

      // ==================== PROBLEMS ====================
      fetchProblems: async (params = {}) => {
        const page = params.page ?? get().currentPage;
        const limit = params.limit ?? get().pageSize;
        const search = params.search !== undefined ? params.search : get().searchQuery;
        const force = params.force ?? false;
        const cacheKey = `${search.trim()}_${page}_${limit}`;

        // Kiểm tra cache từng trang trước
        const cached = get().problemsPageCache[cacheKey];
        if (!force && cached) {
          set({
            problems: cached.items,
            totalProblems: cached.total,
            totalPages: cached.totalPages,
            currentPage: page,
            pageSize: limit,
            searchQuery: search,
            loadingProblems: false,
            problemsError: null,
          });
          return;
        }

        const hasData = get().problems.length > 0;
        if (!hasData || force) {
          set({ loadingProblems: true, problemsError: null });
        }

        try {
          const data = await getProblems({ page, limit, search: search.trim() || undefined });
          if (data && Array.isArray((data as PaginatedProblemsResponse).items)) {
            const paginated = data as PaginatedProblemsResponse;
            const newCache = {
              ...get().problemsPageCache,
              [cacheKey]: {
                items: paginated.items,
                total: paginated.total,
                totalPages: paginated.totalPages || 1,
              },
            };
            set({
              problems: paginated.items,
              totalProblems: paginated.total,
              totalPages: paginated.totalPages || 1,
              currentPage: page,
              pageSize: limit,
              searchQuery: search,
              problemsPageCache: newCache,
              loadingProblems: false,
            });
          } else if (Array.isArray(data)) {
            const total = data.length;
            const totalPages = Math.ceil(total / limit) || 1;
            const newCache = {
              ...get().problemsPageCache,
              [cacheKey]: {
                items: data,
                total,
                totalPages,
              },
            };
            set({
              problems: data,
              totalProblems: total,
              totalPages,
              currentPage: page,
              pageSize: limit,
              searchQuery: search,
              problemsPageCache: newCache,
              loadingProblems: false,
            });
          }
        } catch (err: any) {
          console.error("Lỗi fetchProblems:", err);
          set({
            problemsError: err.message || "Lỗi tải danh sách bài tập",
            loadingProblems: false,
          });
        }
      },

      setProblems: (data) => set({ problems: data }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      addProblem: (item) =>
        set((state) => ({
          problems: [item, ...state.problems],
          totalProblems: state.totalProblems + 1,
          problemsPageCache: {}, // Invalidate cache
        })),
      updateProblemInList: (item) =>
        set((state) => ({
          problems: state.problems.map((p) => (p.id === item.id ? { ...p, ...item } : p)),
          problemsPageCache: {}, // Invalidate cache
        })),
      removeProblemFromList: (id) =>
        set((state) => ({
          problems: state.problems.filter((p) => p.id !== id),
          totalProblems: Math.max(0, state.totalProblems - 1),
          problemsPageCache: {}, // Invalidate cache
        })),

      // ==================== USERS ====================
      fetchUsers: async (params = {}) => {
        const page = params.page ?? get().currentUserPage;
        const limit = params.limit ?? get().userPageSize;
        const search = params.search !== undefined ? params.search : get().userSearchQuery;
        const role = params.role !== undefined ? params.role : get().userRoleFilter;
        const classroomId = params.classroomId !== undefined ? params.classroomId : get().userClassroomIdFilter;
        const force = params.force ?? false;
        const cacheKey = `${search.trim()}_${role}_${classroomId}_${page}_${limit}`;

        // Kiểm tra cache từng trang trước
        const cached = get().usersPageCache[cacheKey];
        if (!force && cached) {
          set({
            users: cached.items,
            totalUsers: cached.total,
            totalUserPages: cached.totalPages,
            currentUserPage: page,
            userPageSize: limit,
            userSearchQuery: search,
            userRoleFilter: role,
            userClassroomIdFilter: classroomId,
            loadingUsers: false,
            usersError: null,
          });
          return;
        }

        const hasData = get().users.length > 0;
        if (!hasData || force) {
          set({ loadingUsers: true, usersError: null });
        }

        try {
          const queryPayload: QueryUsersParams = {
            page,
            limit,
            search: search.trim() || undefined,
            role: role !== "ALL" ? role : undefined,
            classroomId: classroomId || undefined,
          };

          const data = await getUsers(queryPayload);
          if (data && Array.isArray(data.items)) {
            const newCache = {
              ...get().usersPageCache,
              [cacheKey]: {
                items: data.items,
                total: data.total,
                totalPages: data.totalPages || 1,
              },
            };
            set({
              users: data.items,
              totalUsers: data.total,
              totalUserPages: data.totalPages || 1,
              currentUserPage: page,
              userPageSize: limit,
              userSearchQuery: search,
              userRoleFilter: role,
              userClassroomIdFilter: classroomId,
              usersPageCache: newCache,
              loadingUsers: false,
            });
          }
        } catch (err: any) {
          console.error("Lỗi fetchUsers:", err);
          set({
            usersError: err.message || "Lỗi tải danh sách người dùng",
            loadingUsers: false,
          });
        }
      },

      setUsers: (data) => set({ users: data }),
      setCurrentUserPage: (page) => set({ currentUserPage: page }),
      setUserPageSize: (size) => set({ userPageSize: size }),
      setUserSearchQuery: (query) => set({ userSearchQuery: query }),
      setUserRoleFilter: (role) => set({ userRoleFilter: role }),
      setUserClassroomIdFilter: (classroomId) => set({ userClassroomIdFilter: classroomId }),
      addUser: (item) =>
        set((state) => ({
          users: [item, ...state.users],
          totalUsers: state.totalUsers + 1,
          usersPageCache: {}, // Invalidate cache
        })),
      updateUserInList: (item) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === item.id ? { ...u, ...item } : u)),
          usersPageCache: {}, // Invalidate cache
        })),
      removeUserFromList: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          totalUsers: Math.max(0, state.totalUsers - 1),
          usersPageCache: {}, // Invalidate cache
        })),

      // ==================== ADMIN SUBMISSIONS ====================
      fetchAdminSubmissions: async (params = {}) => {
        const {
          page = get().currentAdminSubmissionPage,
          limit = get().adminSubmissionPageSize,
          search = get().adminSubmissionSearch,
          status = get().adminSubmissionStatusFilter,
          language = get().adminSubmissionLanguageFilter,
          classroomId = get().adminSubmissionClassroomId,
          force = false,
        } = params;

        const cacheKey = `${search.trim()}_${status}_${language}_${classroomId}_${page}_${limit}`;

        // Kiểm tra cache từng trang trước
        const cached = get().submissionsPageCache[cacheKey];
        if (!force && cached) {
          set({
            adminSubmissions: cached.items,
            totalAdminSubmissions: cached.total,
            totalAdminSubmissionPages: cached.totalPages,
            currentAdminSubmissionPage: page,
            adminSubmissionPageSize: limit,
            adminSubmissionSearch: search,
            adminSubmissionStatusFilter: status,
            adminSubmissionLanguageFilter: language,
            adminSubmissionClassroomId: classroomId,
            loadingAdminSubmissions: false,
            isChangingClassroom: false,
            adminSubmissionsError: null,
          });
          return;
        }

        const hasData = get().adminSubmissions.length > 0;
        if (!hasData || force) {
          set({ loadingAdminSubmissions: true, adminSubmissionsError: null });
        }

        try {
          const res = await getSubmissions({
            page,
            limit,
            search: search.trim() || undefined,
            status: status !== "ALL" ? status : undefined,
            language: language !== "ALL" ? language : undefined,
            classroomId: classroomId && classroomId !== "ALL" ? classroomId : undefined,
          });

          if (res && res.data) {
            const newCache = {
              ...get().submissionsPageCache,
              [cacheKey]: {
                items: res.data,
                total: res.meta?.total ?? 0,
                totalPages: res.meta?.totalPages ?? 1,
              },
            };
            set({
              adminSubmissions: res.data,
              totalAdminSubmissions: res.meta?.total ?? 0,
              totalAdminSubmissionPages: res.meta?.totalPages ?? 1,
              currentAdminSubmissionPage: page,
              adminSubmissionPageSize: limit,
              adminSubmissionSearch: search,
              adminSubmissionStatusFilter: status,
              adminSubmissionLanguageFilter: language,
              adminSubmissionClassroomId: classroomId,
              submissionsPageCache: newCache,
              loadingAdminSubmissions: false,
              isChangingClassroom: false,
            });
          }
        } catch (err: any) {
          console.error("Lỗi fetchAdminSubmissions:", err);
          set({
            adminSubmissionsError: err.message || "Lỗi tải lịch sử nộp bài",
            loadingAdminSubmissions: false,
            isChangingClassroom: false,
          });
        }
      },

      setAdminSubmissions: (data) => set({ adminSubmissions: data }),
      setCurrentAdminSubmissionPage: (page) => set({ currentAdminSubmissionPage: page }),
      setAdminSubmissionPageSize: (size) => set({ adminSubmissionPageSize: size }),
      setAdminSubmissionSearch: (search) => set({ adminSubmissionSearch: search }),
      setAdminSubmissionStatusFilter: (status) => set({ adminSubmissionStatusFilter: status }),
      setAdminSubmissionLanguageFilter: (language) => set({ adminSubmissionLanguageFilter: language }),
      setAdminSubmissionClassroomId: (classroomId) => {
        const isDifferent = get().adminSubmissionClassroomId !== classroomId;
        set({
          adminSubmissionClassroomId: classroomId,
          ...(isDifferent ? { isChangingClassroom: true } : {}),
        });
      },

      updateAdminSubmissionRealtime: (event) => {
        set((state) => ({
          adminSubmissions: state.adminSubmissions.map((sub) => {
            if (sub.id === event.submissionId) {
              return {
                ...sub,
                status: event.status,
                totalScore: event.totalScore,
                executionTimeMs: event.executionTimeMs ?? sub.executionTimeMs,
                memoryUsedKb: event.memoryUsedKb ?? sub.memoryUsedKb,
                feedback: event.feedback ?? sub.feedback,
              };
            }
            return sub;
          }),
          submissionsPageCache: {}, // Invalidate cache để đồng bộ
        }));
      },

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: "admin-cache-storage",
      storage: createJSONStorage(() => localStorage),
      // Cache các dữ liệu cốt lõi để khi chuyển trang có data ngay lập tức
      partialize: (state) => ({
        dashboard: state.dashboard,
        classrooms: state.classrooms,
        problems: state.problems,
        totalProblems: state.totalProblems,
        totalPages: state.totalPages,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        problemsPageCache: state.problemsPageCache,
        users: state.users,
        totalUsers: state.totalUsers,
        totalUserPages: state.totalUserPages,
        currentUserPage: state.currentUserPage,
        userPageSize: state.userPageSize,
        usersPageCache: state.usersPageCache,
        adminSubmissions: state.adminSubmissions,
        totalAdminSubmissions: state.totalAdminSubmissions,
        totalAdminSubmissionPages: state.totalAdminSubmissionPages,
        currentAdminSubmissionPage: state.currentAdminSubmissionPage,
        adminSubmissionPageSize: state.adminSubmissionPageSize,
        adminSubmissionClassroomId: state.adminSubmissionClassroomId,
        submissionsPageCache: state.submissionsPageCache,
      }),
    }
  )
);
