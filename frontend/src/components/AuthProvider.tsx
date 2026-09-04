// components/AuthProvider.tsx
'use client';

import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const setAuth = useAuthStore((state) => state.setAuth);
    const setIsInitializing = useAuthStore((state) => state.setIsInitializing);
    const userId = useAuthStore((state) => state.userId);

    // Tự động kết nối Socket ngay khi có userId (vừa đăng nhập hoặc vừa khôi phục phiên)
    useEffect(() => {
        if (userId) {
            getSocket(userId);
        }
    }, [userId]);

    useEffect(() => {
        // Nếu người dùng đang ở trang đăng nhập, không cần gọi silentRefresh
        if (
            typeof window !== 'undefined' &&
            (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/auth/login'))
        ) {
            setIsInitializing(false);
            return;
        }

        // Nếu vừa đăng nhập xong và RAM Zustand đã có sẵn accessToken + classroomId, không cần gọi refreshToken lại
        if (useAuthStore.getState().accessToken) {
            setIsInitializing(false);
            return;
        }

        const silentRefresh = async () => {
            try {
                // Backend sẽ tự đọc Refresh Token trong HttpOnly Cookie
                const res = await apiClient.post('/auth/refreshToken');

                if (res.data?.accessToken) {
                    setAuth(res.data.accessToken, res.data.user);
                } else {
                    setIsInitializing(false);
                }
            } catch (error) {
                // Nếu chưa có cookie hoặc hết hạn phiên
                useAuthStore.getState().logout();
            } finally {
                setIsInitializing(false);
            }
        };

        silentRefresh();
    }, [setAuth, setIsInitializing]);

    return <>{children}</>;
}