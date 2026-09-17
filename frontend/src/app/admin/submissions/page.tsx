"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  FolderGit2,
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
  GraduationCap,
  Users,
  Building2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { getSubmissionById } from "@/services/submission.service";
import { getClassList, ClassroomItem } from "@/services/classroom.service";
import {
  SubmissionListItem,
  SubmissionDetailResponse,
  GradingFinishedEvent,
} from "@/types/submission";
import { useAdminStore } from "@/store/useAdminStore";
import { useAuthStore } from "@/store/useAuthStore";
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

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

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

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function AdminSubmissionsPage() {
  const { user } = useAuthStore();
  const {
    adminSubmissions,
    totalAdminSubmissions,
    totalAdminSubmissionPages,
    currentAdminSubmissionPage,
    adminSubmissionPageSize,
    adminSubmissionSearch,
    adminSubmissionStatusFilter,
    adminSubmissionLanguageFilter,
    adminSubmissionClassroomId,
    loadingAdminSubmissions,
    fetchAdminSubmissions,
    setCurrentAdminSubmissionPage,
    setAdminSubmissionPageSize,
    setAdminSubmissionSearch,
    setAdminSubmissionStatusFilter,
    setAdminSubmissionLanguageFilter,
    setAdminSubmissionClassroomId,
    updateAdminSubmissionRealtime,
  } = useAdminStore();

  // Danh sách các lớp học để hiển thị tabs / cards lựa chọn
  const [classList, setClassList] = useState<ClassroomItem[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  // Local state cho ô tìm kiếm để debounce không bị giật lag
  const [searchInput, setSearchInput] = useState(adminSubmissionSearch);

  // Xem chi tiết bài nộp trong Modal
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionDetailResponse | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Loading state khi chuyển trang hoặc đổi lớp học
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Ref & scroll mượt lên đầu trang khi chuyển trang
  const isFirstRender = useRef(true);
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  // 1. Tải danh sách lớp học
  useEffect(() => {
    setLoadingClassrooms(true);
    getClassList()
      .then((data) => setClassList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi lấy danh sách lớp học:", err))
      .finally(() => setLoadingClassrooms(false));
  }, []);

  // Cuộn lên đầu trang khi chuyển trang
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [currentAdminSubmissionPage]);

  // 2. Tải danh sách bài nộp khi các param phân trang, filter thay đổi
  useEffect(() => {
    const cacheKey = `${adminSubmissionSearch.trim()}_${adminSubmissionStatusFilter}_${adminSubmissionLanguageFilter}_${adminSubmissionClassroomId}_${currentAdminSubmissionPage}_${adminSubmissionPageSize}`;
    const isCached = !!useAdminStore.getState().submissionsPageCache[cacheKey];

    // Chỉ bật loading khi trang này CHƯA có trong cache Zustand
    if (!isCached) {
      setIsTableLoading(true);
    }

    fetchAdminSubmissions({
      page: currentAdminSubmissionPage,
      limit: adminSubmissionPageSize,
      search: adminSubmissionSearch,
      status: adminSubmissionStatusFilter,
      language: adminSubmissionLanguageFilter,
      classroomId: adminSubmissionClassroomId,
      force: false,
    }).finally(() => {
      setIsTableLoading(false);
    });
  }, [
    currentAdminSubmissionPage,
    adminSubmissionPageSize,
    adminSubmissionStatusFilter,
    adminSubmissionLanguageFilter,
    adminSubmissionClassroomId,
  ]);

  // 3. Debounce tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== adminSubmissionSearch) {
        setAdminSubmissionSearch(searchInput);
        setCurrentAdminSubmissionPage(1);
        fetchAdminSubmissions({
          page: 1,
          limit: adminSubmissionPageSize,
          search: searchInput,
          status: adminSubmissionStatusFilter,
          language: adminSubmissionLanguageFilter,
          classroomId: adminSubmissionClassroomId,
          force: true,
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Đồng bộ searchInput nếu store bị thay đổi bên ngoài
  useEffect(() => {
    setSearchInput(adminSubmissionSearch);
  }, [adminSubmissionSearch]);

  // 4. Lắng nghe socket thời gian thực khi chấm bài xong
  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);
    if (!socket) return;

    const handleGradingFinished = (event: GradingFinishedEvent) => {
      updateAdminSubmissionRealtime(event);

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
  }, [user?.id, updateAdminSubmissionRealtime]);

  // Xử lý chọn lớp học
  const handleSelectClassroom = (cId: string) => {
    setAdminSubmissionClassroomId(cId);
    setCurrentAdminSubmissionPage(1);
  };

  // Xem chi tiết bài nộp
  const handleViewDetail = async (id: string) => {
    try {
      setLoadingDetailId(id);
      const res = await getSubmissionById(id);
      setSelectedSubmission(res);
    } catch (err: any) {
      console.error("Lỗi khi tải chi tiết bài nộp:", err);
    } finally {
      setLoadingDetailId(null);
    }
  };

  // Lớp học đang được chọn
  const activeClassroom = useMemo(() => {
    if (!adminSubmissionClassroomId) return null;
    return classList.find((c) => c.id === adminSubmissionClassroomId) || null;
  }, [classList, adminSubmissionClassroomId]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Header trang */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
              <FolderGit2 size={14} className="text-purple-600" /> Quản trị Bài nộp
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Lịch sử Nộp bài
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tất cả bài nộp của sinh viên, lọc theo từng lớp học và xem chi tiết chấm bài.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAdminSubmissions({ force: true })}
            disabled={loadingAdminSubmissions}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw
              size={14}
              className={loadingAdminSubmissions ? "animate-spin text-purple-600" : ""}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ===================== KHU VỰC CHỌN LỚP HỌC ===================== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-purple-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Chọn Lớp Học Cần Xem
            </h2>
          </div>
          {activeClassroom && (
            <button
              onClick={() => handleSelectClassroom("")}
              className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
            >
              Xem tất cả các lớp
            </button>
          )}
        </div>

        {/* Lưới các thẻ lớp học */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {/* Nút: Tất cả các lớp */}
          <button
            onClick={() => handleSelectClassroom("")}
            className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              !adminSubmissionClassroomId
                ? "border-purple-500 bg-purple-50/80 ring-2 ring-purple-200 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs"
            }`}
          >
            <div
              className={`flex size-8 items-center justify-center rounded-xl mb-2.5 transition-colors ${
                !adminSubmissionClassroomId
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-600"
              }`}
            >
              <BookOpen size={16} />
            </div>
            <span
              className={`text-xs font-bold truncate w-full ${
                !adminSubmissionClassroomId ? "text-purple-900" : "text-slate-800"
              }`}
            >
              Tất cả các lớp
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Toàn hệ thống
            </span>
          </button>

          {/* Danh sách từng lớp */}
          {classList.map((cls) => {
            const isSelected = adminSubmissionClassroomId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClassroom(cls.id)}
                className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-purple-500 bg-purple-50/80 ring-2 ring-purple-200 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs"
                }`}
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-xl mb-2.5 transition-colors ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-600"
                  }`}
                >
                  <Building2 size={16} />
                </div>
                <span
                  className={`text-xs font-bold truncate w-full ${
                    isSelected ? "text-purple-900" : "text-slate-800"
                  }`}
                  title={cls.name}
                >
                  {cls.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-0.5 truncate w-full">
                  {cls.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================== THANH TÌM KIẾM & BỘ LỌC ===================== */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Tìm kiếm bài tập / sinh viên / mã SV */}
        <div className="relative sm:col-span-6 lg:col-span-5">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên bài tập, tên sinh viên, mã SV..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
          />
        </div>

        {/* Lọc Trạng thái */}
        <div className="sm:col-span-3 lg:col-span-4">
          <select
            value={adminSubmissionStatusFilter}
            onChange={(e) => {
              setAdminSubmissionStatusFilter(e.target.value);
              setCurrentAdminSubmissionPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 shadow-2xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái chấm</option>
            <option value="ACCEPTED">Đã hoàn thành (AC)</option>
            <option value="WRONG_ANSWER">Sai kết quả (WA)</option>
            <option value="TIME_LIMIT_EXCEEDED">Quá thời gian (TLE)</option>
            <option value="MEMORY_LIMIT_EXCEEDED">Tràn bộ nhớ (MLE)</option>
            <option value="RUNTIME_ERROR">Lỗi thực thi (RTE)</option>
            <option value="COMPILATION_ERROR">Lỗi biên dịch (CE)</option>
            <option value="PENDING">Đang chờ chấm</option>
            <option value="RUNNING">Đang chấm</option>
          </select>
        </div>

        {/* Lọc Ngôn ngữ */}
        <div className="sm:col-span-3 lg:col-span-3">
          <select
            value={adminSubmissionLanguageFilter}
            onChange={(e) => {
              setAdminSubmissionLanguageFilter(e.target.value);
              setCurrentAdminSubmissionPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 shadow-2xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
          >
            <option value="ALL">Tất cả ngôn ngữ</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="go">Go</option>
          </select>
        </div>
      </div>

      {/* Thông tin bộ lọc lớp hiện tại */}
      {activeClassroom && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/50 px-4 py-2.5 text-xs text-purple-800">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-purple-600" />
            <span>
              Đang xem lịch sử nộp bài của lớp: <strong>{activeClassroom.name}</strong> ({activeClassroom.code})
            </span>
          </div>
          <button
            onClick={() => handleSelectClassroom("")}
            className="font-semibold text-purple-700 hover:text-purple-900 cursor-pointer underline"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ===================== BẢNG DANH SÁCH BÀI NỘP ===================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/* Thanh loading tiến trình chạy trên đầu bảng khi chuyển trang hoặc đổi lớp */}
        {isTableLoading && (
          <div className="absolute top-0 left-0 right-0 z-20 h-1 overflow-hidden bg-purple-100">
            <div className="h-full w-full animate-pulse bg-purple-600"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 pl-6 pr-4">Sinh viên</th>
                <th className="px-4 py-3.5">Bài tập</th>
                <th className="px-4 py-3.5">Lớp học</th>
                <th className="px-4 py-3.5">Ngôn ngữ</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Điểm số</th>
                <th className="px-4 py-3.5 text-center">Thời gian</th>
                <th className="px-4 py-3.5 text-center">Bộ nhớ</th>
                <th className="px-4 py-3.5">Thời điểm nộp</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100 text-xs transition-opacity duration-200 ${
                isTableLoading ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {loadingAdminSubmissions && adminSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-purple-600 mb-2" />
                    <p className="text-xs text-slate-500">Đang tải lịch sử bài nộp...</p>
                  </td>
                </tr>
              ) : adminSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <FolderGit2 size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Chưa có bài nộp nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {adminSubmissionClassroomId
                        ? "Lớp học này chưa có sinh viên nào nộp bài."
                        : "Không tìm thấy bài nộp nào phù hợp với bộ lọc."}
                    </p>
                  </td>
                </tr>
              ) : (
                adminSubmissions.map((sub) => {
                  const statusConfig = statusBadgeMap[sub.status] || {
                    text: sub.status,
                    bg: "bg-slate-100",
                    textCol: "text-slate-700",
                    borderCol: "border-slate-200",
                    icon: <AlertCircle size={13} />,
                  };

                  const langClass =
                    languageColorMap[sub.language.toLowerCase()] ||
                    "bg-slate-100 text-slate-700 border-slate-200";

                  const classroomName =
                    sub.assignment?.classroom?.name ||
                    classList.find((c) => c.id === sub.assignment?.classroomId)?.name ||
                    "-";

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Sinh viên */}
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 font-bold text-xs">
                            {sub.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">
                              {sub.user?.fullName || "Sinh viên"}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400">
                              {sub.user?.studentCode || "Chưa có MSSV"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Bài tập */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 line-clamp-1">
                          {sub.assignment?.problem?.title || "Bài tập"}
                        </p>
                        <span className="font-mono text-[10px] text-slate-400">
                          #{sub.id.substring(0, 8)}
                        </span>
                      </td>

                      {/* Lớp học */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          <Building2 size={11} className="text-slate-400" />
                          <span className="truncate max-w-[120px]" title={classroomName}>
                            {classroomName}
                          </span>
                        </span>
                      </td>

                      {/* Ngôn ngữ */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase ${langClass}`}
                        >
                          {sub.language}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusConfig.bg} ${statusConfig.textCol} ${statusConfig.borderCol}`}
                        >
                          {statusConfig.icon}
                          <span>{statusConfig.text}</span>
                        </span>
                      </td>

                      {/* Điểm số */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-xs font-bold ${
                            sub.totalScore === 10
                              ? "text-emerald-600"
                              : sub.totalScore > 0
                              ? "text-purple-600"
                              : "text-slate-500"
                          }`}
                        >
                          {sub.totalScore.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400"> / 10.0</span>
                      </td>

                      {/* Thời gian thực thi */}
                      <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-500">
                        {sub.executionTimeMs != null ? `${sub.executionTimeMs} ms` : "-"}
                      </td>

                      {/* Bộ nhớ */}
                      <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-500">
                        {sub.memoryUsedKb != null
                          ? `${(sub.memoryUsedKb / 1024).toFixed(1)} MB`
                          : "-"}
                      </td>

                      {/* Thời điểm nộp */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(sub.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>

                      {/* Nút Xem chi tiết */}
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <button
                          onClick={() => handleViewDetail(sub.id)}
                          disabled={loadingDetailId === sub.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-purple-600 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {loadingDetailId === sub.id ? (
                            <Loader2 size={13} className="animate-spin text-purple-600" />
                          ) : (
                            <Eye size={13} />
                          )}
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================== PHÂN TRANG ===================== */}
        {totalAdminSubmissionPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 p-4 text-xs text-slate-500 bg-slate-50/50">
            <div className="text-slate-600 font-medium">
              Hiển thị{" "}
              <strong>
                {(currentAdminSubmissionPage - 1) * adminSubmissionPageSize + 1}
              </strong>{" "}
              –{" "}
              <strong>
                {Math.min(
                  currentAdminSubmissionPage * adminSubmissionPageSize,
                  totalAdminSubmissions
                )}
              </strong>{" "}
              trong số <strong>{totalAdminSubmissions}</strong> bài nộp
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto flex-wrap">
              {/* Nút Trước */}
              <button
                onClick={() =>
                  setCurrentAdminSubmissionPage(
                    Math.max(1, currentAdminSubmissionPage - 1)
                  )
                }
                disabled={currentAdminSubmissionPage <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-purple-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {/* Danh sách trang */}
              {getPaginationRange(
                currentAdminSubmissionPage,
                totalAdminSubmissionPages
              ).map((item, index) => {
                if (item === "...") {
                  return (
                    <span
                      key={`dots-${index}`}
                      className="px-2 py-1 text-slate-400 font-medium select-none"
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = Number(item);
                const isActive = pageNum === currentAdminSubmissionPage;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentAdminSubmissionPage(pageNum)}
                    className={`min-w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-purple-600"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Nút Sau */}
              <button
                onClick={() =>
                  setCurrentAdminSubmissionPage(
                    Math.min(
                      totalAdminSubmissionPages,
                      currentAdminSubmissionPage + 1
                    )
                  )
                }
                disabled={currentAdminSubmissionPage >= totalAdminSubmissionPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-purple-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chi tiết bài nộp */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
}
