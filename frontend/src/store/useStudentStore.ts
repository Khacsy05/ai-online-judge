import { create } from "zustand";
import { ClassroomProgress } from "@/types";
import { getMyProgress, getClassList } from "@/services";
import { useAuthStore } from "./useAuthStore";

interface StudentState {
  progress: ClassroomProgress | null;
  loading: boolean;
  error: string | null;

  // Lấy dữ liệu: Nếu đã có trong Zustand và không ép buộc (force = false) thì không gọi lại API
  fetchProgress: (force?: boolean) => Promise<void>;

  // Cập nhật dữ liệu trực tiếp
  setProgress: (data: ClassroomProgress | null) => void;

  // Xóa cache khi đăng xuất
  resetProgress: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  progress: null,
  loading: false,
  error: null,

  setProgress: (data) => set({ progress: data }),
  resetProgress: () => set({ progress: null, loading: false, error: null }),

  fetchProgress: async (force = false) => {
    // Nếu đã có dữ liệu trong Zustand và không yêu cầu làm mới (force = false), bỏ qua không gọi lại API
    if (get().progress && !force) {
      return;
    }

    try {
      // Chỉ bật loading xoay xoay nếu chưa từng có dữ liệu trước đó
      if (!get().progress) {
        set({ loading: true });
      }
      set({ error: null });

      const authState = useAuthStore.getState();
      let targetClassroomId =
        authState.classroomId || authState.user?.classroomId;

      if (!targetClassroomId) {
        const classrooms = await getClassList();
        if (!classrooms || classrooms.length === 0) {
          throw new Error("Chưa có lớp học nào trong hệ thống.");
        }
        for (const cl of classrooms) {
          try {
            const data = await getMyProgress(cl.id);
            set({ progress: data, loading: false });
            return;
          } catch {
            continue;
          }
        }
        throw new Error("Tài khoản này hiện chưa được xếp vào lớp học nào.");
      }

      const data = await getMyProgress(targetClassroomId);
      set({ progress: data, loading: false });
    } catch (err: any) {
      console.error("Lỗi tải tiến độ lớp học:", err);
      set({
        error: err.message || "Không thể kết nối đến máy chủ.",
        loading: false,
      });
    }
  },
}));
