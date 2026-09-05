import { create } from "zustand";
import { LeaderboardResponse, LeaderboardStudent, PaginationMeta } from "@/types/classroom";
import { getClassroomLeaderboard, getClassList } from "@/services/classroom.service";
import { useAuthStore } from "./useAuthStore";

interface CacheItem {
  data: LeaderboardResponse;
}

interface LeaderboardState {
  data: LeaderboardResponse | null;
  loading: boolean;
  refreshing: boolean;
  isPageLoading: boolean;
  error: string | null;

  // Filter params
  search: string;
  page: number;
  limit: number;

  // Cache lưu dữ liệu theo key: classroomId_search_page_limit
  pageCache: Record<string, CacheItem>;

  // Actions
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  fetchLeaderboard: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
  reset: () => void;
}

const DEFAULT_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  data: null,
  loading: false,
  refreshing: false,
  isPageLoading: false,
  error: null,

  search: "",
  page: 1,
  limit: 6,

  pageCache: {},

  setSearch: (search: string) => {
    if (get().search === search) return;
    set({ search, page: 1 });
    get().fetchLeaderboard(false);
  },

  setPage: (page: number) => {
    if (get().page === page) return;
    set({ page });
    get().fetchLeaderboard(false);
  },

  fetchLeaderboard: async (force = false) => {
    const { search, page, limit, pageCache } = get();

    // 1. Chờ Auth nếu đang trong quá trình khôi phục phiên
    if (useAuthStore.getState().isInitializing) {
      await new Promise<void>((resolve) => {
        let count = 0;
        const checkInit = () => {
          count++;
          if (!useAuthStore.getState().isInitializing || count > 30) {
            resolve();
          } else {
            setTimeout(checkInit, 30);
          }
        };
        checkInit();
      });
    }

    const authState = useAuthStore.getState();
    let targetClassroomId =
      authState.classroomId ||
      authState.user?.classroomId ||
      (authState.user?.classrooms && authState.user.classrooms.length > 0
        ? authState.user.classrooms[0].id
        : null);

    if (!targetClassroomId) {
      try {
        const classrooms = await getClassList();
        if (classrooms && classrooms.length > 0) {
          targetClassroomId = classrooms[0].id;
        }
      } catch (e) {
        console.error("Lỗi lấy danh sách lớp học:", e);
      }
    }

    if (!targetClassroomId) {
      set({
        error: "Không tìm thấy thông tin lớp học của sinh viên.",
        loading: false,
        refreshing: false,
        isPageLoading: false,
      });
      return;
    }

    const cacheKey = `${targetClassroomId}_${search.trim()}_${page}_${limit}`;

    // 2. Kiểm tra cache
    if (!force && pageCache[cacheKey]) {
      const cached = pageCache[cacheKey];
      set({
        data: cached.data,
        loading: false,
        isPageLoading: false,
        refreshing: false,
        error: null,
      });
      return;
    }

    try {
      if (force) {
        set({ refreshing: true, error: null });
      } else if (!get().data) {
        // Lần đầu vào trang chưa có data
        set({ loading: true, error: null });
      } else {
        // Đã có data nhưng chuyển trang / đổi từ khóa chưa có cache
        set({ isPageLoading: true, error: null });
      }

      const res: LeaderboardResponse = await getClassroomLeaderboard(targetClassroomId, {
        search: search.trim() || undefined,
        page,
        limit,
      });

      if (res) {
        const newCache = {
          ...get().pageCache,
          [cacheKey]: { data: res },
        };

        set({
          data: res,
          pageCache: newCache,
          loading: false,
          isPageLoading: false,
          refreshing: false,
          error: null,
        });
      }
    } catch (err: any) {
      console.error("Lỗi khi tải bảng xếp hạng:", err);
      set({
        error: err.response?.data?.message || err.message || "Không thể tải bảng xếp hạng.",
        loading: false,
        isPageLoading: false,
        refreshing: false,
      });
    }
  },

  invalidateCache: () => set({ pageCache: {} }),

  reset: () =>
    set({
      data: null,
      pageCache: {},
      page: 1,
      search: "",
      loading: false,
      refreshing: false,
      isPageLoading: false,
      error: null,
    }),
}));
