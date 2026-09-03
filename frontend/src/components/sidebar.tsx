"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Send,
  Trophy,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Danh sách các mục điều hướng
  const navItems = [
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
            Không gian học tập
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Kiểm tra xem mục này có đang active (được chọn) hay không
              const isActive =
                pathname === item.path ||
                (item.path === "/student" && (pathname === "/student" || pathname === "/"));

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
        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Cần hỗ trợ?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Liên hệ giảng viên nếu bạn gặp vấn đề trong quá trình làm bài.
          </p>
        </div>
      </aside>
    </>
  );
}
