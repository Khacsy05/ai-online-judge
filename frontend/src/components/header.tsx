"use client";

import React from "react";
import { Menu, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutUser } from "@/services/auth.service";

interface HeaderProps {
  onOpenMenu: () => void;
  classroomName?: string;
  studentName?: string;
  studentRole?: string;
}

export function Header({
  onOpenMenu,
  classroomName = "Lập trình nâng cao",
  studentName,
  studentRole,
}: HeaderProps) {
  const storeUser = useAuthStore((state) => state.user);
  const displayName = studentName || storeUser?.fullname || "Người dùng";
  const displayRole =
    studentRole ||
    (storeUser?.role === "ADMIN"
      ? "Quản trị viên"
      : storeUser?.role === "LECTURER"
      ? "Giảng viên"
      : "Sinh viên");

  // Chữ cái đầu tiên đại diện avatar
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : "SV";

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8 shadow-xs">
      <button
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        onClick={onOpenMenu}
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden text-sm text-slate-400 sm:block">
        Lớp học / <span className="text-slate-700 font-semibold">{classroomName}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Thông tin tài khoản */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 shadow-xs border border-blue-200">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {displayName}
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {displayRole}
            </p>
          </div>
        </div>

        {/* Nút Đăng xuất */}
        <button
          onClick={() => logoutUser()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={14} className="text-slate-500 hover:text-rose-600" />
          <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
