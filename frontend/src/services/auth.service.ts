import { DataLogin } from "@/types/auth";
import apiClient from "@/lib/apiClient";
import { useAuthStore } from "@/store/useAuthStore";

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
  try {
    // 1. Gọi API xóa Cookie refreshToken ở Backend NestJS
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.error("Lỗi khi đăng xuất trên máy chủ:", error);
  } finally {
    // 2. Xóa sạch Zustand RAM, LocalStorage và Cookie trên Frontend TRƯỚC
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("current_user");
      document.cookie = "access_token=; path=/; max-age=0";
      document.cookie = "refreshToken=; path=/; max-age=0";

      // 3. Sau khi Cookie đã được xóa sạch hoàn toàn, mới chuyển về trang Login
      window.location.href = "/auth/login";
    }
  }
}