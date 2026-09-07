import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ClassroomProgress } from "@/types";
import { getMyProgress } from "@/services";
import { useAuthStore } from "./useAuthStore";

interface StudentState {
  progress: ClassroomProgress | null;
  loading: boolean;
  error: string | null;

  // Lấy dữ liệu: SWR pattern - nếu đã có cache hiển thị ngay, gọi API ngầm để cập nhật mới nhất
  fetchProgress: (force?: boolean) => Promise<void>;

  // Cập nhật dữ liệu trực tiếp
  setProgress: (data: ClassroomProgress | null) => void;

  // Xóa cache khi đăng xuất
  resetProgress: () => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      progress: null,
      loading: false,
      error: null,

      setProgress: (data) => set({ progress: data }),
      resetProgress: () => set({ progress: null, loading: false, error: null }),

      fetchProgress: async (force = false) => {
        // Nếu Auth vẫn đang trong quá trình khôi phục phiên, tạm dừng chờ
        if (useAuthStore.getState().isInitializing) {
          return;
        }

        try {
          // Chỉ bật loading xoay tròn nếu TRƯỚC ĐÓ CHƯA TỪNG CÓ dữ liệu cache nào
          if (!get().progress) {
            set({ loading: true });
          }
          set({ error: null });

          const authState = useAuthStore.getState();
          const targetClassroomId =
            authState.classroomId ||
            authState.user?.classroomId ||
            (authState.user?.classrooms && authState.user.classrooms.length > 0
              ? authState.user.classrooms[0].id
              : null);

          if (!targetClassroomId) {
            if (!authState.userId) {
              set({ loading: false });
              return;
            }
            throw new Error("Tài khoản của bạn hiện chưa được phân vào lớp học nào.");
          }

          // Gọi API cập nhật tiến độ mới nhất từ server
          const data = await getMyProgress(targetClassroomId);
          if (data) {
            set({ progress: data, loading: false });
          }
        } catch (err: any) {
          console.error("Lỗi tải tiến độ lớp học:", err);
          set({
            error: err.message || "Không thể kết nối đến máy chủ.",
            loading: false,
          });
        }
      },
    }),
    {
      name: "student-progress-storage",
      storage: createJSONStorage(() => localStorage),
      // Chỉ lưu trữ dữ liệu progress bài tập, không lưu loading hay error
      partialize: (state) => ({
        progress: state.progress,
      }),
    }
  )
);
