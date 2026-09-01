"use client";

import React from "react";
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  Send,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-5 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Code2 size={19} />
          </div>
          <div>
            <p className="font-semibold tracking-tight text-slate-900">CodeLab</p>
            <p className="text-xs text-slate-400">Learning platform</p>
          </div>
        </div>

        <div className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
            Không gian học tập
          </p>
          <nav className="space-y-1">
            <a
              className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700"
              href="#"
            >
              <LayoutDashboard size={17} /> Tổng quan
            </a>
            <a
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50"
              href="#assignments"
            >
              <BookOpen size={17} /> Bài tập của tôi
            </a>
            <a
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50"
              href="#submissions"
            >
              <Send size={17} /> Lịch sử nộp bài
            </a>
          </nav>
        </div>

        <div className="absolute bottom-5 left-5 right-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Cần hỗ trợ?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Liên hệ giảng viên nếu bạn gặp vấn đề.
          </p>
        </div>
      </aside>
    </>
  );
}
