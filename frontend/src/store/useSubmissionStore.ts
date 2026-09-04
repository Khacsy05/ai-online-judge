import { create } from "zustand";
import {
  SubmissionListItem,
  SubmissionStats,
  GradingFinishedEvent,
} from "@/types/submission";
import { getSubmissions } from "@/services/submission.service";
import { useAuthStore } from "./useAuthStore";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CacheItem {
  data: SubmissionListItem[];
  meta: PaginationMeta;
}

interface SubmissionState {
  submissions: SubmissionListItem[];
  meta: PaginationMeta;
  stats: SubmissionStats | null;
  loading: boolean;
  refreshing: boolean;
  isPageLoading: boolean;
  error: string | null;

  // Filter params
  search: string;
  statusFilter: string;
  languageFilter: string;
  page: number;
  limit: number;

  // Cache lưu dữ liệu theo key: search_status_lang_page_limit
  pageCache: Record<string, CacheItem>;

  // Actions
  setSearch: (search: string) => void;
  setStatusFilter: (status: string) => void;
  setLanguageFilter: (language: string) => void;
  setPage: (page: number) => void;
  fetchSubmissions: (force?: boolean) => Promise<void>;
  updateSubmissionRealtime: (event: GradingFinishedEvent) => void;
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

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  submissions: [],
  meta: DEFAULT_META,
  stats: null,
  loading: false,
  refreshing: false,
  isPageLoading: false,
  error: null,

  search: "",
  statusFilter: "ALL",
  languageFilter: "ALL",
  page: 1,
  limit: 6,

  pageCache: {},

  setSearch: (search: string) => {
    if (get().search === search) return;
    set({ search, page: 1 });
    get().fetchSubmissions(false);
  },

  setStatusFilter: (statusFilter: string) => {
    if (get().statusFilter === statusFilter) return;
    set({ statusFilter, page: 1 });
    get().fetchSubmissions(false);
  },

  setLanguageFilter: (languageFilter: string) => {
    if (get().languageFilter === languageFilter) return;
    set({ languageFilter, page: 1 });
    get().fetchSubmissions(false);
  },

  setPage: (page: number) => {
    if (get().page === page) return;
    set({ page });
    get().fetchSubmissions(false);
  },

  fetchSubmissions: async (force = false) => {
    const { search, statusFilter, languageFilter, page, limit, pageCache } = get();
    const cacheKey = `${search.trim()}_${statusFilter}_${languageFilter}_${page}_${limit}`;

    // 1. Nếu đã có dữ liệu cache của trang này và không ép buộc tải lại (force = false)
    if (!force && pageCache[cacheKey]) {
      const cached = pageCache[cacheKey];
      set({
        submissions: cached.data,
        meta: cached.meta,
        loading: false,
        isPageLoading: false,
        error: null,
      });
      return;
    }

    // 2. Chờ Auth nếu đang khôi phục phiên
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
    const targetUserId = authState.userId || authState.user?.id;
    if (!targetUserId) return;

    try {
      if (force) {
        set({ refreshing: true, error: null });
      } else if (get().submissions.length === 0) {
        // Chưa có dữ liệu nào (lần đầu vào trang)
        set({ loading: true, error: null });
      } else {
        // Đã có dữ liệu nhưng chuyển sang trang chưa được cache
        set({ isPageLoading: true, error: null });
      }

      const res = await getSubmissions({
        userId: targetUserId,
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        language: languageFilter !== "ALL" ? languageFilter : undefined,
        page,
        limit,
      });

      if (res && res.data) {
        const newCache = {
          ...get().pageCache,
          [cacheKey]: { data: res.data, meta: res.meta },
        };

        set({
          submissions: res.data,
          meta: res.meta,
          stats: res.stats || get().stats,
          pageCache: newCache,
          loading: false,
          isPageLoading: false,
          refreshing: false,
        });
      }
    } catch (err: any) {
      console.error("Lỗi khi tải lịch sử nộp bài:", err);
      set({
        error: err.message || "Không thể tải danh sách bài nộp.",
        loading: false,
        isPageLoading: false,
        refreshing: false,
      });
    }
  },

  updateSubmissionRealtime: (event: GradingFinishedEvent) => {
    // 1. Cập nhật submission trong danh sách hiện tại
    set((state) => {
      const updatedList = state.submissions.map((sub) =>
        sub.id === event.submissionId
          ? {
              ...sub,
              status: event.status,
              totalScore: event.totalScore,
              executionTimeMs: event.executionTimeMs,
              memoryUsedKb: event.memoryUsedKb,
              feedback: event.feedback,
            }
          : sub
      );

      // 2. Cập nhật đồng bộ vào pageCache các trang có chứa bài nộp này
      const updatedCache: Record<string, CacheItem> = {};
      for (const [key, val] of Object.entries(state.pageCache)) {
        updatedCache[key] = {
          ...val,
          data: val.data.map((sub) =>
            sub.id === event.submissionId
              ? {
                  ...sub,
                  status: event.status,
                  totalScore: event.totalScore,
                  executionTimeMs: event.executionTimeMs,
                  memoryUsedKb: event.memoryUsedKb,
                  feedback: event.feedback,
                }
              : sub
          ),
        };
      }

      return { submissions: updatedList, pageCache: updatedCache };
    });

    // 3. Nếu đang ở trang 1, làm mới ngầm để cập nhật stats và vị trí bài mới nhất
    if (get().page === 1) {
      get().fetchSubmissions(true);
    }
  },

  invalidateCache: () => set({ pageCache: {} }),

  reset: () =>
    set({
      submissions: [],
      meta: DEFAULT_META,
      stats: null,
      pageCache: {},
      page: 1,
      search: "",
      statusFilter: "ALL",
      languageFilter: "ALL",
      loading: false,
      refreshing: false,
      isPageLoading: false,
      error: null,
    }),
}));
