"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Crown,
  Search,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  BookOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";

/**
 * Tạo danh sách phân trang có dấu 3 chấm (...)
 */
function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function LeaderboardPage() {
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = useAuthStore((state) => state.userId);

  // Zustand Leaderboard Store
  const {
    data,
    loading,
    refreshing,
    isPageLoading,
    error,
    search,
    page,
    setSearch,
    setPage,
    fetchLeaderboard,
  } = useLeaderboardStore();

  // Local state cho ô tìm kiếm để debounce
  const [searchInput, setSearchInput] = useState(search);

  // Cuộn mượt lên đầu
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // 1. Tải bảng xếp hạng khi mount
  useEffect(() => {
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  // 2. Debounce tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, setSearch]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // 3. Tự động cuộn lên đầu khi page thay đổi
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [page]);

  const students = data?.leaderboard || [];
  const meta = data?.meta || {
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Top 3 sinh viên vinh danh trên Podium
  const top1 = students.find((s) => s.rank === 1) || (page === 1 ? students[0] : null);
  const top2 = students.find((s) => s.rank === 2) || (page === 1 ? students[1] : null);
  const top3 = students.find((s) => s.rank === 3) || (page === 1 ? students[2] : null);

  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > meta.totalPages) return;
    setPage(newPage);
    scrollToTop();
  };

  // Lấy 2 ký tự đầu cho Avatar
  const getAvatarInitials = (name: string) => {
    if (!name) return "SV";
    const parts = name.trim().split(" ");
    return parts.slice(-2).map((p) => p[0]).join("").toUpperCase();
  };

  // Màn hình Loading lần đầu tiên
  if (loading && !data) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">
          Đang tải bảng xếp hạng lớp học...
        </p>
      </div>
    );
  }

  // Màn hình Báo lỗi
  if (error && !data) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center text-rose-700">
          <AlertCircle size={36} className="mx-auto mb-2 text-rose-500" />
          <h3 className="font-bold text-base">Không thể tải bảng xếp hạng</h3>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* Tiêu đề & Thông tin lớp */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <Trophy size={13} className="text-amber-600" /> Bảng xếp hạng lớp
            </span>
            <span className="text-xs text-slate-400 font-mono">
              • {data?.classroomCode || "LỚP HỌC"}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Bảng Xếp Hạng Học Tập
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tôn vinh thành tích giải bài tập và nỗ lực học tập của tất cả sinh viên trong lớp{" "}
            <span className="font-semibold text-slate-700">
              {data?.classroomName || "Lập trình nâng cao"}
            </span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-blue-600" : ""}
            />
            <span>{refreshing ? "Đang làm mới..." : "Làm mới"}</span>
          </button>
          <Link
            href="/student"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors"
          >
            <BookOpen size={14} />
            <span>Xem bài tập lớp</span>
          </Link>
        </div>
      </div>

      {/* 3 Thẻ thống kê tổng quan */}
      <section className="mb-9 grid gap-4 sm:grid-cols-3">
        {/* Thẻ 1: Tổng sinh viên */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Tổng sinh viên lớp</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data?.studentCount || 0}{" "}
            <span className="text-xs font-normal text-slate-400">sinh viên</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">đang tham gia học tập và giải bài</p>
        </div>

        {/* Thẻ 2: Điểm cao nhất lớp */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Điểm cao nhất (Top 1)</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Flame size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {top1?.totalScore ?? 0}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {data?.maxClassScore || 0} Điểm
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {top1 ? `🏆 ${top1.fullName} (${top1.studentCode || top1.email})` : "Chưa có dữ liệu"}
          </p>
        </div>

        {/* Thẻ 3: Tổng bài tập đã giao */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Số bài tập được giao</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data?.totalAssignments || 0}{" "}
            <span className="text-xs font-normal text-slate-400">bài tập</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">thang điểm tối đa 10.0đ mỗi bài</p>
        </div>
      </section>

      {/* Podium Vinh danh TOP 1, TOP 2, TOP 3 (Chỉ hiện ở trang 1 và khi không có lọc từ khóa) */}
      {top1 && page === 1 && !search && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Bục Vinh Danh Top 3 Sinh Viên Xuất Sắc
            </h2>
            <span className="text-xs text-slate-400 font-medium">Cập nhật tự động</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-end">
            {/* TOP 2 (Bên trái) */}
            {top2 ? (
              <div className="relative order-2 md:order-1 flex flex-col items-center rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-6 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <div className="absolute -top-3.5 flex items-center gap-1 rounded-full border border-slate-300 bg-slate-200 px-3 py-0.5 text-xs font-bold text-slate-700 shadow-2xs">
                  <Medal size={13} className="text-slate-500" /> #2 Bạc
                </div>

                <div className="mt-2 relative">
                  <div className="flex size-18 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-700 border-2 border-slate-300 shadow-xs">
                    {getAvatarInitials(top2.fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-slate-600 text-white text-[11px] font-bold">
                    2
                  </div>
                </div>

                <h3 className="mt-3.5 font-bold text-slate-900 text-base text-center">
                  {top2.fullName}
                </h3>
                <p className="text-xs font-mono text-slate-400">{top2.studentCode || top2.email}</p>

                <div className="mt-4 flex w-full flex-col gap-1.5 rounded-xl bg-slate-100/70 p-3 text-center border border-slate-200/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tổng điểm:</span>
                    <span className="font-bold text-slate-900 text-sm">{top2.totalScore}đ</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Bài giải được:</span>
                    <span className="font-semibold text-slate-700">
                      {top2.solvedCount}/{data?.totalAssignments || 0} bài
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 hidden md:block" />
            )}

            {/* TOP 1 (Ở Giữa - Cao nhất & Nổi bật nhất) */}
            <div className="relative order-1 md:order-2 flex flex-col items-center rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 p-7 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="absolute -top-4 flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-400 px-3.5 py-1 text-xs font-extrabold text-amber-950 shadow-xs animate-bounce">
                <Crown size={14} className="fill-amber-950" /> QUÁN QUÂN #1
              </div>

              <div className="mt-1 relative">
                <div className="flex size-22 items-center justify-center rounded-full bg-gradient-to-tr from-amber-200 to-amber-100 text-2xl font-black text-amber-800 border-4 border-amber-300 shadow-md">
                  {getAvatarInitials(top1.fullName)}
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-black shadow-sm">
                  1
                </div>
              </div>

              <h3 className="mt-4 font-bold text-slate-900 text-lg text-center">
                {top1.fullName}
              </h3>
              <p className="text-xs font-mono text-amber-700 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md mt-0.5">
                {top1.studentCode || top1.email}
              </p>

              <div className="mt-4 flex w-full flex-col gap-2 rounded-xl bg-amber-100/50 p-3.5 text-center border border-amber-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-medium">Tổng điểm tích lũy:</span>
                  <span className="font-extrabold text-amber-700 text-base">{top1.totalScore}đ</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-900 font-medium">Bài giải hoàn hảo:</span>
                  <span className="font-bold text-slate-800">
                    {top1.solvedCount}/{data?.totalAssignments || 0} bài ({top1.progressPercentage}%)
                  </span>
                </div>
              </div>
            </div>

            {/* TOP 3 (Bên phải) */}
            {top3 ? (
              <div className="relative order-3 flex flex-col items-center rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-white p-6 shadow-xs transition-all hover:shadow-md hover:-translate-y-1">
                <div className="absolute -top-3.5 flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800 shadow-2xs">
                  <Medal size={13} className="text-amber-600" /> #3 Đồng
                </div>

                <div className="mt-2 relative">
                  <div className="flex size-18 items-center justify-center rounded-full bg-amber-100/80 text-lg font-bold text-amber-800 border-2 border-amber-200 shadow-xs">
                    {getAvatarInitials(top3.fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-amber-700 text-white text-[11px] font-bold">
                    3
                  </div>
                </div>

                <h3 className="mt-3.5 font-bold text-slate-900 text-base text-center">
                  {top3.fullName}
                </h3>
                <p className="text-xs font-mono text-slate-400">{top3.studentCode || top3.email}</p>

                <div className="mt-4 flex w-full flex-col gap-1.5 rounded-xl bg-slate-100/70 p-3 text-center border border-slate-200/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tổng điểm:</span>
                    <span className="font-bold text-slate-900 text-sm">{top3.totalScore}đ</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Bài giải được:</span>
                    <span className="font-semibold text-slate-700">
                      {top3.solvedCount}/{data?.totalAssignments || 0} bài
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-3 hidden md:block" />
            )}
          </div>
        </section>
      )}

      {/* Bảng Xếp Hạng Chi Tiết & Tìm kiếm */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Thanh loading mỏng khi đang tải trang mới (chưa có cache) */}
        {isPageLoading && (
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-100 overflow-hidden z-20">
            <div className="h-full bg-amber-500 animate-pulse" style={{ width: "100%" }} />
          </div>
        )}

        {/* Header bảng & Ô tìm kiếm */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Danh sách xếp hạng sinh viên ({meta.total})
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Thứ hạng được tính theo tổng điểm giải bài tập giảm dần
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên, MSSV hoặc email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Bảng dữ liệu */}
        {students.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4 text-center w-16">Thứ hạng</th>
                    <th className="px-4 py-3.5">Sinh viên</th>
                    <th className="px-4 py-3.5">Mã sinh viên</th>
                    <th className="px-4 py-3.5 text-center">Số bài giải được</th>
                    <th className="px-4 py-3.5">Tiến độ lớp</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100 transition-opacity duration-200 ${
                    isPageLoading ? "opacity-60 pointer-events-none" : "opacity-100"
                  }`}
                >
                  {students.map((st) => {
                    const isCurrentUser =
                      currentUser?.studentCode === st.studentCode ||
                      currentUser?.id === st.userId ||
                      currentUserId === st.userId;

                    // Huy hiệu thứ hạng
                    let rankBadge = (
                      <span className="font-mono font-bold text-slate-500 text-sm">
                        #{st.rank}
                      </span>
                    );

                    if (st.rank === 1) {
                      rankBadge = (
                        <div className="flex size-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs mx-auto">
                          1
                        </div>
                      );
                    } else if (st.rank === 2) {
                      rankBadge = (
                        <div className="flex size-7 items-center justify-center rounded-full bg-slate-300 text-slate-800 font-bold text-xs shadow-xs mx-auto">
                          2
                        </div>
                      );
                    } else if (st.rank === 3) {
                      rankBadge = (
                        <div className="flex size-7 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs mx-auto">
                          3
                        </div>
                      );
                    }

                    return (
                      <tr
                        key={st.userId}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isCurrentUser
                            ? "bg-blue-50/60 font-medium hover:bg-blue-50/90"
                            : ""
                        }`}
                      >
                        {/* Cột 1: Thứ hạng */}
                        <td className="py-4 pl-6 pr-4 text-center">{rankBadge}</td>

                        {/* Cột 2: Tên sinh viên */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                              {getAvatarInitials(st.fullName)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                {st.fullName}
                                {isCurrentUser && (
                                  <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white uppercase">
                                    Tôi
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">{st.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Mã SV */}
                        <td className="px-4 py-4 font-mono text-slate-600 font-semibold text-xs">
                          {st.studentCode || "-"}
                        </td>

                        {/* Cột 4: Số bài giải được */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 text-xs border border-slate-200/60">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            {st.solvedCount} / {data?.totalAssignments || 0}
                          </span>
                        </td>

                        {/* Cột 5: Tiến độ phần trăm */}
                        <td className="px-4 py-4 w-44">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500 font-medium">
                              {st.progressPercentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${Math.min(100, st.progressPercentage)}%` }}
                            />
                          </div>
                        </td>

                        {/* Cột 6: Tổng điểm */}
                        <td className="py-4 pl-4 pr-6 text-right">
                          <span className="font-bold text-slate-900 text-sm">
                            {st.totalScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {" "}
                            / {data?.maxClassScore || 0}đ
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang số */}
            {meta.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 p-4 text-xs text-slate-500 bg-slate-50/50">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong>{(meta.page - 1) * meta.limit + 1}</strong> –{" "}
                  <strong>{Math.min(meta.page * meta.limit, meta.total)}</strong> trong số{" "}
                  <strong>{meta.total}</strong> sinh viên
                </div>

                <div className="flex items-center gap-1.5 self-center sm:self-auto flex-wrap">
                  {/* Nút Trước */}
                  <button
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={!meta.hasPrevPage || isPageLoading}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Trước</span>
                  </button>

                  {/* Danh sách trang */}
                  {getPaginationRange(meta.page, meta.totalPages).map((item, idx) => {
                    if (item === "...") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1.5 py-1 text-slate-400 select-none text-xs font-medium"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = Number(item);
                    const isActive = pageNum === meta.page;

                    return (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isPageLoading || isActive}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600 cursor-default"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Nút Sau */}
                  <button
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={!meta.hasNextPage || isPageLoading}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Trạng thái tìm kiếm không thấy */
          <div className="p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Users size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Không tìm thấy sinh viên nào
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? `Không có sinh viên nào khớp với từ khóa "${search}".`
                : "Lớp học này hiện chưa có sinh viên nào tham gia."}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}