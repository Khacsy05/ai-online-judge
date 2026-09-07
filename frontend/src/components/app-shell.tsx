"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {/* Sidebar - tự động chuyển menu theo Role (ADMIN / STUDENT / LECTURER) */}
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Khung nội dung chính */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header cố định */}
        <Header onOpenMenu={() => setMenuOpen(true)} />

        {/* Nội dung thay đổi của từng trang con */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
