import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';
import { toast } from 'sonner';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
});

// 1. Đính Access Token từ Zustand RAM hoặc LocalStorage vào Header
apiClient.interceptors.request.use((config) => {
    let token = useAuthStore.getState().accessToken;
    if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('access_token');
    }
    if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 2. Xử lý khi Access Token hết hạn giữa chừng (Trả về 401)
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Bỏ qua cơ chế refresh token nếu endpoint là các yêu cầu Auth cơ bản (để tránh lặp hoặc tự động logout)
        const isAuthRequest = originalRequest?.url?.includes('/auth/login') ||
            originalRequest?.url?.includes('/auth/refreshToken') ||
            originalRequest?.url?.includes('/auth/logout');

        // Nếu dính lỗi 401 và request này không phải là auth request và chưa từng retry
        if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Gọi API cấp lại Access Token mới
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/refreshToken`,
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = res.data.accessToken;

                // Lưu Access Token mới vào Zustand (RAM)
                useAuthStore.getState().setAuth(newAccessToken);

                // Gắn token mới vào request cũ và thực hiện lại
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);

            } catch (refreshError: any) {
                console.error('RefreshToken failed:', refreshError);
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;