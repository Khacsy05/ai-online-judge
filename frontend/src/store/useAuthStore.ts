import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { disconnectSocket } from "@/lib/socket";

export type Role = "ADMIN" | "STUDENT" | "LECTURER";

export interface JwtPayload {
    id: string;
    name: string;
    email: string;
    role: Role;
    classroomId?: string | null;
    exp?: number;
    iat?: number;
}

export interface UserDetail {
    id: string;
    fullname: string;
    email: string;
    role: Role;
    studentCode?: string;
    classroomId?: string | null;
    classrooms?: Array<{ id: string; code: string; name: string }>;
}

interface AuthStore {
    accessToken: string | null;
    user: UserDetail | null;
    role: Role | null;
    userId: string | null;
    fullname: string | null;
    email: string | null;
    classroomId: string | null;
    isInitializing: boolean;
    isLoggingOut: boolean;

    setAuth: (accessToken: string, userDetail?: Partial<UserDetail>) => void;
    logout: () => void;
    setIsInitializing: (status: boolean) => void;
    setIsLoggingOut: (status: boolean) => void;
    updateUserDetail: (name: string, email: string) => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            accessToken: null,
            user: null,
            role: null,
            userId: null,
            fullname: null,
            email: null,
            classroomId: null,
            isInitializing: true,
            isLoggingOut: false,

            setAuth: (accessToken: string, userDetail?: Partial<UserDetail>) => {
                if (!accessToken || typeof accessToken !== "string") {
                    set({ isInitializing: false });
                    return;
                }

                try {
                    const decoded = jwtDecode<JwtPayload>(accessToken);
                    const classroomId = userDetail?.classroomId || decoded.classroomId || null;

                    const fullname =
                        (userDetail as any)?.fullName ||
                        (userDetail as any)?.name ||
                        userDetail?.fullname ||
                        decoded.name;

                    const userObj: UserDetail = {
                        id: decoded.id,
                        fullname: fullname,
                        email: userDetail?.email || decoded.email,
                        role: decoded.role,
                        classroomId: classroomId,
                        classrooms: userDetail?.classrooms || [],
                    };

                    set({
                        accessToken: accessToken,
                        user: userObj,
                        role: decoded.role,
                        userId: decoded.id,
                        fullname: fullname,
                        email: userObj.email,
                        classroomId: classroomId,
                        isInitializing: false,
                    });
                } catch (error) {
                    console.error("Lỗi giải mã JWT Access Token:", error);
                    set({ isInitializing: false });
                }
            },

            logout: () => {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("student-progress-storage");
                    disconnectSocket();
                }

                set({
                    accessToken: null,
                    user: null,
                    role: null,
                    userId: null,
                    fullname: null,
                    email: null,
                    classroomId: null,
                    isInitializing: false,
                });
            },

            setIsInitializing: (status: boolean) => set({ isInitializing: status }),
            setIsLoggingOut: (status: boolean) => set({ isLoggingOut: status }),

            updateUserDetail: (name: string, email: string) =>
                set((state) => ({
                    fullname: name,
                    email: email,
                    user: state.user
                        ? { ...state.user, fullname: name, email }
                        : null,
                })),
        }),
        {
            name: "auth-storage",
            storage: createJSONStorage(() => localStorage),
            // Chỉ persist thông tin cần thiết, bỏ qua isInitializing & isLoggingOut
            partialize: (state) => ({
                accessToken: state.accessToken,
                user: state.user,
                role: state.role,
                userId: state.userId,
                fullname: state.fullname,
                email: state.email,
                classroomId: state.classroomId,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Khi vừa nạp xong từ persist, đánh dấu sẵn sàng ngay
                    state.setIsInitializing(false);
                }
            },
        }
    )
);