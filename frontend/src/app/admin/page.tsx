"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
  Server,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  FileCode2,
} from "lucide-react";
import { getAdminStats, AdminStatsResponse } from "@/services/admin.service";
import { getClassList, ClassroomItem } from "@/services/classroom.service";
import { getSubmissions } from "@/services/submission.service";
import { SubmissionListItem } from "@/types/submission";

import { useAdminStore } from "@/store/useAdminStore";

export default function AdminDashboardPage() {
  const { dashboard, loadingDashboard, refreshingDashboard, fetchDashboard } = useAdminStore();
  const { stats, classrooms, recentSubmissions } = dashboard;
  const [searchClass, setSearchClass] = useState("");

  const loadData = async (isManualRefresh = false) => {
    await fetchDashboard(isManualRefresh);
  };

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const filteredClassrooms = classrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(searchClass.toLowerCase()) ||
      c.code.toLowerCase().includes(searchClass.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case "WRONG_ANSWER":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <XCircle size={12} /> Wrong Answer
          </span>
        );
      case "TIME_LIMIT_EXCEEDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock3 size={12} /> TLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* 1. Header & Quick Actions */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <ShieldCheck size={14} className="text-blue-600" /> Bảng điều khiển Quản trị
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> Hệ thống Online
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Tổng quan điều hành CodeLab
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tình hình học tập theo lớp, kho bài tập và các lượt nộp bài của toàn bộ hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshingDashboard}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={refreshingDashboard ? "animate-spin text-blue-600" : ""}
            />
            <span>{refreshingDashboard ? "Đang đồng bộ..." : "Đồng bộ số liệu"}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Thẻ chỉ số vĩ mô (KPI Macro Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Lớp học */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lớp học đang mở
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <GraduationCap size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {loadingDashboard ? "..." : stats?.totalClassrooms ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">lớp quản lý</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <Sparkles size={12} className="text-blue-500" /> Phân cấp bài tập theo từng lớp
          </div>
        </div>

        {/* Ngân hàng bài tập */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kho đề bài tập
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {loadingDashboard ? "..." : stats?.totalProblems ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">đề bài</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <FileCode2 size={12} className="text-amber-500" /> Sẵn sàng giao cho các kỳ học
          </div>
        </div>

        {/* Người dùng */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tài khoản hệ thống
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {loadingDashboard ? "..." : (stats?.totalStudents ?? 0) + (stats?.totalAdmins ?? 0)}
            </span>
            <span className="text-xs text-slate-500 font-medium">tài khoản</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{stats?.totalStudents ?? 0}</span> Sinh viên •{" "}
            <span className="font-semibold text-slate-700">{stats?.totalAdmins ?? 0}</span> Quản trị viên
          </div>
        </div>

        {/* Lượt nộp bài */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng lượt nộp bài
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Send size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {loadingDashboard ? "..." : stats?.totalSubmissions ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">lần nộp</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp size={13} /> Tỷ lệ AC: {stats?.acceptanceRate ?? 0}% ({stats?.acceptedSubmissions ?? 0} bài đúng)
          </div>
        </div>
      </div>

      {/* 3. Bố cục 2 cột: Quản lý theo lớp học (trái) & Hoạt động nộp bài toàn trường (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột 1 & 2: Danh sách lớp học (Mô hình lấy Lớp học làm trung tâm) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap size={20} className="text-blue-600" />
                  Quản lý Lớp học ({classrooms.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mỗi lớp quản lý riêng biệt sinh viên, bài tập và bảng xếp hạng độc lập.
                </p>
              </div>

              {/* Tìm kiếm lớp */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã lớp..."
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Bảng danh sách lớp */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-2">Mã lớp</th>
                    <th className="pb-3">Tên môn học</th>
                    <th className="pb-3 text-center">Sĩ số sinh viên</th>
                    <th className="pb-3 text-center">Bài tập đã giao</th>
                    <th className="pb-3 pr-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {loadingDashboard && filteredClassrooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Đang tải danh sách lớp học...
                      </td>
                    </tr>
                  ) : filteredClassrooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không tìm thấy lớp học nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredClassrooms.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 pl-2 font-mono font-bold text-blue-700">
                          {c.code}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-900">
                          {c.name}
                        </td>
                        <td className="py-3.5 text-center font-medium">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {c._count?.members ?? 0} SV
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-medium">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {c._count?.assignments ?? 0} bài
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <Link
                            href={`/admin/classrooms`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                          >
                            Quản lý lớp <ChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cột 3: Hoạt động nộp bài gần đây & Trạng thái Engine */}
        <div className="space-y-6">
          {/* Box 1: Tình trạng máy chủ & AI Chấm */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Server size={16} className="text-slate-600" /> Trạng thái hạ tầng
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="font-medium text-slate-600 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> MySQL Database
                </span>
                <span className="font-mono text-emerald-600 font-semibold">Kết nối tốt</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="font-medium text-slate-600 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> Redis & BullMQ
                </span>
                <span className="font-mono text-emerald-600 font-semibold">Sẵn sàng</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="font-medium text-slate-600 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 animate-pulse" /> AI Feedback Engine
                </span>
                <span className="font-mono text-blue-600 font-semibold">Trực tuyến</span>
              </div>
            </div>
          </div>

          {/* Box 2: Bài nộp gần đây toàn trường (Live Feed) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity size={16} className="text-rose-600" /> Bài nộp mới nhất
              </h3>
              <span className="text-[11px] text-slate-400">Toàn hệ thống</span>
            </div>

            <div className="space-y-3">
              {loadingDashboard && recentSubmissions.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">Đang nạp bài nộp...</p>
              ) : recentSubmissions.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">Chưa có bài nộp nào.</p>
              ) : (
                recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {sub.assignment?.problem?.title || "Bài tập lập trình"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {sub.user?.fullName || "Sinh viên"} • <span className="font-mono uppercase">{sub.language}</span>
                      </p>
                    </div>
                    <div>{getStatusBadge(sub.status)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}