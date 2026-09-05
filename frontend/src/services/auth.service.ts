import { DataLogin } from "@/types/auth";
import apiClient from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useStudentStore } from "@/store/useStudentStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";

export async function loginUser(data: DataLogin) {
  try {
    const login = await apiClient.post("/auth/login", data);
    return login;
  } catch (error: any) {
    console.error("Lỗi khi đăng nhập:", error);
    const message =
      error.response?.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
}

export async function logoutUser() {
  // 1. Kích hoạt màn hình loading đăng xuất full màn hình trắng ngay lập tức
  useAuthStore.getState().setIsLoggingOut(true);

  // 2. Dọn dẹp Storage và Cookie
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "refreshToken=; path=/; max-age=0";
  }

  // 3. Xóa Store RAM
  useAuthStore.getState().logout();
  useStudentStore.getState().resetProgress();
  useSubmissionStore.getState().reset();
  useLeaderboardStore.getState().reset();

  try {
    // 4. Gửi request thông báo Backend xóa HttpOnly Cookie / blacklist session
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.error("Lỗi khi đăng xuất trên máy chủ:", error);
  } finally {
    // 5. Chuyển sang trang Login
    if (typeof window !== "undefined") {
      window.location.replace("/auth/login");
    }
  }
}