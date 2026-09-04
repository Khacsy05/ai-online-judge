"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  Cpu,
  FileCode2,
  Filter,
  Eye,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { getSubmissionById } from "@/services/submission.service";
import {
  SubmissionDetailResponse,
  GradingFinishedEvent,
} from "@/types/submission";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { SubmissionDetailModal } from "@/components/submission-detail-modal";
import { getSocket } from "@/lib/socket";

const statusBadgeMap: Record<
  string,
  { text: string; bg: string; textCol: string; borderCol: string; icon: React.ReactNode }
> = {
  ACCEPTED: {
    text: "Đã hoàn thành",
    bg: "bg-emerald-50",
    textCol: "text-emerald-700",
    borderCol: "border-emerald-200",
    icon: <CheckCircle2 size={13} className="text-emerald-600" />,
  },
  WRONG_ANSWER: {
    text: "Sai kết quả",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
    icon: <XCircle size={13} className="text-rose-600" />,
  },
  TIME_LIMIT_EXCEEDED: {
    text: "Quá thời gian",
    bg: "bg-amber-50",
    textCol: "text-amber-700",
    borderCol: "border-amber-200",
    icon: <Clock3 size={13} className="text-amber-600" />,
  },
  MEMORY_LIMIT_EXCEEDED: {
    text: "Tràn bộ nhớ",
    bg: "bg-amber-50",
    textCol: "text-amber-700",
    borderCol: "border-amber-200",
    icon: <Cpu size={13} className="text-amber-600" />,
  },
  RUNTIME_ERROR: {
    text: "Lỗi thực thi",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
    icon: <AlertCircle size={13} className="text-rose-600" />,
  },
  COMPILATION_ERROR: {
    text: "Lỗi biên dịch",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
    icon: <AlertCircle size={13} className="text-rose-600" />,
  },
  PENDING: {
    text: "Đang chờ chấm",
    bg: "bg-slate-100",
    textCol: "text-slate-700",
    borderCol: "border-slate-200",
    icon: <Loader2 size={13} className="text-slate-600 animate-spin" />,
  },
  RUNNING: {
    text: "Đang chấm",
    bg: "bg-blue-50",
    textCol: "text-blue-700",
    borderCol: "border-blue-200",
    icon: <Loader2 size={13} className="text-blue-600 animate-spin" />,
  },
  CANCELLED: {
    text: "Đã hủy",
    bg: "bg-slate-100",
    textCol: "text-slate-500",
    borderCol: "border-slate-200",
    icon: <XCircle size={13} className="text-slate-400" />,
  },
};

const languageColorMap: Record<string, string> = {
  cpp: "bg-blue-50 text-blue-700 border-blue-200",
  python: "bg-amber-50 text-amber-700 border-amber-200",
  java: "bg-orange-50 text-orange-700 border-orange-200",
  javascript: "bg-yellow-50 text-yellow-800 border-yellow-200",
  typescript: "bg-sky-50 text-sky-700 border-sky-200",
  go: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

/**
 * Tạo danh sách các số trang cần hiển thị có dấu ba chấm (...)
 */
function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Đang ở gần đầu (trang 1..4)
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // Đang ở gần cuối
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Ở khoảng giữa
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export default function SubmissionsPage() {
  const userId = useAuthStore((state) => state.userId);
  const user = useAuthStore((state) => state.user);

  // Ref đỉnh trang phục vụ cuộn mượt khi phân trang
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Zustand Store: lưu cache trang, giữ state khi chuyển tab mà không gọi lại API
  const {
    submissions,
    meta,
    stats,
    loading,
    refreshing,
    isPageLoading,
    error,
    search,
    statusFilter,
    languageFilter,
    page,
    setSearch,
    setStatusFilter,
    setLanguageFilter,
    setPage,
    fetchSubmissions,
    updateSubmissionRealtime,
  } = useSubmissionStore();

  // Local state cho ô tìm kiếm để debounce không bị giật lag khi gõ
  const [searchInput, setSearchInput] = useState(search);

  // Xem chi tiết bài nộp trong Modal
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionDetailResponse | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Hàm cuộn mượt lên đầu trang
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

  // 1. Tải danh sách bài nộp khi mount hoặc khi userId sẵn sàng
  // Nếu đã có trong Zustand pageCache (ví dụ chuyển tab qua lại), sẽ lấy ngay từ cache mà không gọi API
  useEffect(() => {
    fetchSubmissions(false);
  }, [fetchSubmissions, userId, user?.id]);

  // 2. Debounce tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, setSearch]);

  // Đồng bộ searchInput nếu store bị reset hoặc thay đổi từ ngoài
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

  // 4. Kết nối Socket.io để nhận kết quả chấm bài thời gian thực
  useEffect(() => {
    const currentUserId = userId || user?.id;
    if (!currentUserId) return;

    const socket = getSocket(currentUserId);
    if (!socket) return;

    const handleGradingFinished = (event: GradingFinishedEvent) => {
      console.log("📡 [SubmissionsPage] Nhận kết quả chấm bài thời gian thực:", event);
      updateSubmissionRealtime(event);

      // Nếu đang mở modal của đúng bài nộp này, cập nhật modal luôn
      setSelectedSubmission((prev) => {
        if (prev && prev.id === event.submissionId) {
          return {
            ...prev,
            status: event.status,
            totalScore: event.totalScore,
            executionTimeMs: event.executionTimeMs,
            memoryUsedKb: event.memoryUsedKb,
            feedback: event.feedback,
          };
        }
        return prev;
      });
    };

    socket.on("gradingFinished", handleGradingFinished);

    return () => {
      socket.off("gradingFinished", handleGradingFinished);
    };
  }, [userId, user?.id, updateSubmissionRealtime]);

  // Xử lý chuyển trang và cuộn mượt lên đầu trang
  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || newPage > meta.totalPages) return;
    setPage(newPage);
    scrollToTop();
  };

  // Xử lý mở modal xem chi tiết
  const handleViewDetail = async (submissionId: string) => {
    try {
      setLoadingDetailId(submissionId);
      const detail = await getSubmissionById(submissionId);
      setSelectedSubmission(detail);
    } catch (err: any) {
      console.error("Lỗi khi lấy chi tiết bài nộp:", err);
    } finally {
      setLoadingDetailId(null);
    }
  };

  const currentStats = stats || {
    total: meta.total,
    acceptedCount: 0,
    rate: 0,
    avgScore: "0.0",
  };

  // Chỉ hiển thị loader toàn màn hình trong lần đầu tiên truy cập chưa có dữ liệu nào
  if (loading && submissions.length === 0) {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">
          Đang tải lịch sử nộp bài...
        </p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* Tiêu đề trang & Nút hành động */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <History size={13} /> Lịch sử nộp bài
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Lịch sử nộp bài của tôi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi danh sách các lần nộp bài, điểm số chấm tự động và nhận xét chi tiết từ AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSubmissions(true)}
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
            <span>Làm bài tập mới</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* 3 Thẻ thống kê tổng quan */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        {/* Thẻ 1: Tổng số bài nộp */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Tổng lần nộp bài</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <History size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currentStats.total}</p>
          <p className="mt-1 text-xs text-slate-400">tổng số lượt nộp của tài khoản</p>
        </div>

        {/* Thẻ 2: Bài nộp Accepted */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Bài đạt điểm tối đa (AC)</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {currentStats.acceptedCount}{" "}
            <span className="text-sm font-normal text-slate-400">
              / {currentStats.total} bài
            </span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${currentStats.rate}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[11px] font-medium text-emerald-600">
            Tỉ lệ đạt: {currentStats.rate}%
          </p>
        </div>

        {/* Thẻ 3: Điểm trung bình */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Điểm trung bình</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {currentStats.avgScore} <span className="text-xs font-normal text-slate-400">/ 10.0</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">trung bình trên tất cả bài nộp</p>
        </div>
      </section>

      {/* Bảng danh sách bài nộp & Bộ lọc */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Thanh loading mỏng khi đang tải trang mới (chưa có cache) */}
        {isPageLoading && (
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden z-20">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: "100%" }} />
          </div>
        )}

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên bài tập..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Dropdown Bộ lọc trạng thái & ngôn ngữ */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter size={14} />
              <span>Lọc:</span>
            </div>

            {/* Lọc trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACCEPTED">Đã hoàn thành (AC)</option>
              <option value="WRONG_ANSWER">Sai kết quả (WA)</option>
              <option value="TIME_LIMIT_EXCEEDED">Quá thời gian (TLE)</option>
              <option value="MEMORY_LIMIT_EXCEEDED">Tràn bộ nhớ (MLE)</option>
              <option value="RUNTIME_ERROR">Lỗi thực thi (RTE)</option>
              <option value="COMPILATION_ERROR">Lỗi biên dịch (CE)</option>
              <option value="PENDING">Đang chờ chấm</option>
              <option value="RUNNING">Đang chấm</option>
            </select>

            {/* Lọc ngôn ngữ */}
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả ngôn ngữ</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
            </select>
          </div>
        </div>

        {/* Bảng Danh sách bài nộp */}
        {submissions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">Bài tập</th>
                    <th className="px-4 py-3.5">Ngôn ngữ</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5 text-center">Điểm số</th>
                    <th className="px-4 py-3.5 text-center">Thời gian</th>
                    <th className="px-4 py-3.5 text-center">Bộ nhớ</th>
                    <th className="px-4 py-3.5">Thời gian nộp</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100 transition-opacity duration-200 ${
                    isPageLoading ? "opacity-60 pointer-events-none" : "opacity-100"
                  }`}
                >
                  {submissions.map((sub) => {
                    const statusConfig = statusBadgeMap[sub.status] || {
                      text: sub.status,
                      bg: "bg-slate-100",
                      textCol: "text-slate-700",
                      borderCol: "border-slate-200",
                      icon: null,
                    };

                    const langClass =
                      languageColorMap[sub.language?.toLowerCase()] ||
                      "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Cột 1: Tên bài tập */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                              <FileCode2 size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                {sub.assignment?.problem?.title || "Bài tập"}
                              </p>
                              <span className="font-mono text-[10px] text-slate-400">
                                #{sub.id.substring(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Ngôn ngữ */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-mono font-semibold uppercase ${langClass}`}
                          >
                            {sub.language}
                          </span>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusConfig.bg} ${statusConfig.textCol} ${statusConfig.borderCol}`}
                          >
                            {statusConfig.icon}
                            <span>{statusConfig.text}</span>
                          </span>
                        </td>

                        {/* Cột 4: Điểm số */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`text-sm font-bold ${
                              sub.totalScore === 10
                                ? "text-emerald-600"
                                : sub.totalScore > 0
                                ? "text-blue-600"
                                : "text-slate-500"
                            }`}
                          >
                            {sub.totalScore.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400"> / 10.0</span>
                        </td>

                        {/* Cột 5: Thời gian chạy */}
                        <td className="px-4 py-4 text-center font-mono text-[11px] text-slate-500">
                          {sub.executionTimeMs != null
                            ? `${sub.executionTimeMs} ms`
                            : "-"}
                        </td>

                        {/* Cột 6: Bộ nhớ sử dụng */}
                        <td className="px-4 py-4 text-center font-mono text-[11px] text-slate-500">
                          {sub.memoryUsedKb != null
                            ? `${(sub.memoryUsedKb / 1024).toFixed(1)} MB`
                            : "-"}
                        </td>

                        {/* Cột 7: Thời gian nộp */}
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {new Date(sub.createdAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>

                        {/* Cột 8: Nút Xem chi tiết */}
                        <td className="py-4 pl-4 pr-6 text-right">
                          <button
                            onClick={() => handleViewDetail(sub.id)}
                            disabled={loadingDetailId === sub.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {loadingDetailId === sub.id ? (
                              <Loader2 size={13} className="animate-spin text-blue-600" />
                            ) : (
                              <Eye size={13} />
                            )}
                            <span>Chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang số (Numeric Pagination) với chọn trang trực tiếp */}
            {meta.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 p-4 text-xs text-slate-500 bg-slate-50/50">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong>{(meta.page - 1) * meta.limit + 1}</strong> –{" "}
                  <strong>{Math.min(meta.page * meta.limit, meta.total)}</strong> trong số{" "}
                  <strong>{meta.total}</strong> bài nộp
                </div>

                <div className="flex items-center gap-1.5 self-center sm:self-auto flex-wrap">
                  {/* Nút Trang trước */}
                  <button
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={!meta.hasPrevPage || isPageLoading}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Trước</span>
                  </button>

                  {/* Danh sách các số trang */}
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

                  {/* Nút Trang sau */}
                  <button
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={!meta.hasNextPage || isPageLoading}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Trang sau"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Trạng thái trống */
          <div className="p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <History size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {search || statusFilter !== "ALL" || languageFilter !== "ALL"
                ? "Không tìm thấy bài nộp nào"
                : "Chưa có bài nộp nào"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || languageFilter !== "ALL"
                ? "Không có bài nộp nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
                : "Bạn chưa nộp bài tập nào. Hãy vào danh sách bài tập của lớp để bắt đầu nộp bài làm đầu tiên nhé!"}
            </p>
            {search || statusFilter !== "ALL" || languageFilter !== "ALL" ? (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("ALL");
                  setLanguageFilter("ALL");
                  setPage(1);
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <Link
                href="/student"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <span>Xem danh sách bài tập</span>
                <ChevronRight size={13} />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Modal Xem chi tiết bài nộp */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}