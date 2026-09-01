"use client";

import React from "react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onOpenMenu: () => void;
  classroomName?: string;
  studentName?: string;
  studentRole?: string;
}

export function Header({
  onOpenMenu,
  classroomName = "Lập trình nâng cao",
  studentName = "Nguyễn An",
  studentRole = "Sinh viên",
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <button
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        onClick={onOpenMenu}
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden text-sm text-slate-400 sm:block">
        Lớp học / <span className="text-slate-700 font-medium">{classroomName}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          NA
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-slate-900 leading-tight">
            {studentName}
          </p>
          <p className="text-[11px] text-slate-400">
            {studentRole}
          </p>
        </div>
      </div>
    </header>
  );
}
