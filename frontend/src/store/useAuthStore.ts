import { create } from "zustand";
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

    setAuth: (accessToken: string, userDetail?: Partial<UserDetail>) => void;
    logout: () => void;
    setIsInitializing: (status: boolean) => void;
    updateUserDetail: (name: string, email: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    accessToken: null,
    user: null,
    role: null,
    userId: null,
    fullname: null,
    email: null,
    classroomId: null,
    isInitializing: true,

    setAuth: (accessToken: string, userDetail?: Partial<UserDetail>) => {
        if (!accessToken || typeof accessToken !== "string") {
            set({ isInitializing: false });
            return;
        }

        try {
            const decoded = jwtDecode<JwtPayload>(accessToken);
            const classroomId = userDetail?.classroomId || decoded.classroomId || null;

            const userObj: UserDetail = {
                id: decoded.id,
                fullname: userDetail?.fullname || decoded.name,
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
                fullname: userObj.fullname,
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
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");
            document.cookie = "access_token=; path=/; max-age=0";
            document.cookie = "refreshToken=; path=/; max-age=0";
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

    updateUserDetail: (name: string, email: string) =>
        set((state) => ({
            fullname: name,
            email: email,
            user: state.user
                ? { ...state.user, fullname: name, email }
                : null,
        })),
}));