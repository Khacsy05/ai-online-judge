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

    return (
        <>
            {children}

            {/* Màn hình loading trắng toàn màn hình khi đang đăng xuất */}
            {useAuthStore((state) => state.isLoggingOut) && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                            <div className="size-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-base font-bold text-slate-800 tracking-tight">
                                Đang đăng xuất...
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Vui lòng chờ trong giây lát
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}