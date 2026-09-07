"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Send,
  Trophy,
  Users,
  GraduationCap,
  FileCode2,
  FolderGit2,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((state) => state.role || state.user?.role);

  // Danh sách menu cho Sinh viên
  const studentNavItems = [
    {
      label: "Tổng quan",
      path: "/student",
      icon: LayoutDashboard,
    },
    {
      label: "Bảng xếp hạng",
      path: "/student/leaderboard",
      icon: Trophy,
    },
    {
      label: "Lịch sử nộp bài",
      path: "/student/submissions",
      icon: Send,
    },
  ];

  // Danh sách menu cho Quản trị viên (Admin)
  const adminNavItems = [
    {
      label: "Bảng điều khiển",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Quản lý người dùng",
      path: "/admin/users",
      icon: Users,
    },
    {
      label: "Quản lý lớp học",
      path: "/admin/classrooms",
      icon: GraduationCap,
    },
    {
      label: "Ngân hàng bài tập",
      path: "/admin/problems",
      icon: FileCode2,
    },
    {
      label: "Bài nộp toàn hệ thống",
      path: "/admin/submissions",
      icon: FolderGit2,
    },
  ];

  // Chọn menu theo role hiện tại hoặc theo URL
  const isAdminArea = pathname.startsWith("/admin") || role === "ADMIN";
  const navItems = isAdminArea ? adminNavItems : studentNavItems;
  const sectionTitle = isAdminArea ? "Quản trị hệ thống" : "Không gian học tập";

  const handleNavigate = (path: string) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-5 transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Code2 size={19} />
          </div>
          <div>
            <p className="font-semibold tracking-tight text-slate-900">CodeLab</p>
            <p className="text-xs text-slate-400">AI Online Judge</p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
            {sectionTitle}
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Kiểm tra xem mục này có đang active (được chọn) hay không
              const isActive =
                pathname === item.path ||
                (item.path !== "/student" && item.path !== "/admin" && pathname.startsWith(item.path));

              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left ${isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-blue-700" : "text-slate-400"}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Hỗ trợ */}
        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-700">
            {isAdminArea ? "Phiên làm việc Quản trị" : "Cần hỗ trợ?"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isAdminArea
              ? "Quyền Admin: quản lý lớp học, ngân hàng đề bài và người dùng."
              : "Liên hệ giảng viên nếu bạn gặp vấn đề trong quá trình làm bài."}
          </p>
        </div>
      </aside>
    </>
  );
}
