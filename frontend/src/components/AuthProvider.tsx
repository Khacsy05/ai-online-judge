// components/AuthProvider.tsx
'use client';

import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const setAuth = useAuthStore((state) => state.setAuth);
    const setIsInitializing = useAuthStore((state) => state.setIsInitializing);

    useEffect(() => {
        // Nếu người dùng đang ở trang đăng nhập, không cần gọi silentRefresh
        if (
            typeof window !== 'undefined' &&
            (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/auth/login'))
        ) {
            setIsInitializing(false);
            return;
        }

        const silentRefresh = async () => {
            try {
                // Backend sẽ tự đọc Refresh Token trong HttpOnly Cookie
                const res = await apiClient.post('/auth/refreshToken');

                if (res.data?.accessToken) {
                    setAuth(res.data.accessToken);
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