"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Search,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  Eye,
} from "lucide-react";
import { Assignment, ClassroomProgress } from "@/types";
import { DetailModal } from "@/components/detail-modal";
import { SubmitModal } from "@/components/submit-modal";
import { SubmissionDetailModal } from "@/components/submission-detail-modal";
import { getSubmissions, getSubmissionById } from "@/services/submission.service";
import { SubmissionDetailResponse } from "@/types/submission";
import { useAuthStore } from "@/store/useAuthStore";
import { useStudentStore } from "@/store/useStudentStore";

const statusDisplayMap: Record<
  string,
  { text: string; style: string }
> = {
  ACCEPTED: {
    text: "Đã hoàn thành",
    style: "bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200",
  },
  WRONG_ANSWER: {
    text: "Sai kết quả",
    style: "bg-rose-50 text-rose-700 ring-rose-200 border-rose-200",
  },
  TIME_LIMIT_EXCEEDED: {
    text: "Quá thời gian",
    style: "bg-amber-50 text-amber-700 ring-amber-200 border-amber-200",
  },
  MEMORY_LIMIT_EXCEEDED: {
    text: "Tràn bộ nhớ",
    style: "bg-amber-50 text-amber-700 ring-amber-200 border-amber-200",
  },
  RUNTIME_ERROR: {
    text: "Lỗi thực thi",
    style: "bg-rose-50 text-rose-700 ring-rose-200 border-rose-200",
  },
  COMPILATION_ERROR: {
    text: "Lỗi biên dịch",
    style: "bg-rose-50 text-rose-700 ring-rose-200 border-rose-200",
  },
  PENDING: {
    text: "Đang chờ chấm",
    style: "bg-slate-100 text-slate-700 ring-slate-200 border-slate-200",
  },
  RUNNING: {
    text: "Đang chấm",
    style: "bg-blue-50 text-blue-700 ring-blue-200 border-blue-200 animate-pulse",
  },
  NOT_SUBMITTED: {
    text: "Chưa nộp",
    style: "bg-slate-100 text-slate-600 ring-slate-200 border-slate-200",
  },
};

export default function StudentDashboard() {
  const { progress: data, loading, error, fetchProgress } = useStudentStore();

  const [selected, setSelected] = useState<Assignment | null>(null);
  const [submitFor, setSubmitFor] = useState<Assignment | null>(null);
  const [query, setQuery] = useState("");

  const currentUser = useAuthStore((state) => state.user);

  // Xem chi tiết lỗi bài nộp
  const [viewSubmissionDetail, setViewSubmissionDetail] =
    useState<SubmissionDetailResponse | null>(null);
  const [loadingSubmissionId, setLoadingSubmissionId] = useState<string | null>(
    null
  );

  const handleOpenSubmissionDetail = async (submissionId: string) => {
    try {
      setLoadingSubmissionId(submissionId);
      const detail = await getSubmissionById(submissionId);
      setViewSubmissionDetail(detail);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết bài nộp:", err);
    } finally {
      setLoadingSubmissionId(null);
    }
  };

  const handleViewLatestSubmission = async (assignmentId: string) => {
    try {
      const targetUserId = currentUser?.id || useAuthStore.getState().userId;
      const res = await getSubmissions({
        userId: targetUserId || undefined,
        assignmentId,
        limit: 1,
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (list && list.length > 0) {
        await handleOpenSubmissionDetail(list[0].id);
      }
    } catch (err) {
      console.error("Lỗi khi tải bài nộp gần nhất:", err);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const assignments = data?.assignments || [];

  const filtered = useMemo(
    () =>
      assignments.filter((a) =>
        a.problemTitle.toLowerCase().includes(query.toLowerCase())
      ),
    [assignments, query]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm animate-spin">
          <Loader2 size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Đang tải dữ liệu từ máy chủ...
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Vui lòng đợi trong giây lát khi hệ thống tổng hợp bài tập và điểm số.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center text-rose-700">
          <AlertCircle size={36} className="mx-auto mb-2 text-rose-500" />
          <h3 className="font-bold text-base">Không thể tải dữ liệu bài tập</h3>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
          <button
            onClick={() => fetchProgress(true)}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const nearestDeadline =
    assignments.length > 0
      ? new Date(assignments[0].deadline).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      : "Không có";

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* Lời chào & Tiêu đề lớp học */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5">
            <Sparkles size={13} /> {data?.classroomCode} • {data?.classroomName}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Xin chào, {currentUser?.fullname || "Sinh viên 01"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Đây là toàn bộ bài tập và tiến độ điểm số được cập nhật trực tiếp từ hệ thống chấm điểm AI.
        </p>
      </div>

      {/* 3 Thẻ thống kê tổng quan (Live từ Database) */}
      <section className="mb-9 grid gap-4 sm:grid-cols-3">
        {/* Thẻ 1: Tổng bài tập */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Tổng bài tập</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={19} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data?.totalAssignments || 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">được giao trong lớp học này</p>
        </div>

        {/* Thẻ 2: Điểm tiến độ lớp */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Tiến độ điểm lớp</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={19} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data?.studentTotalScore || 0}{" "}
            <span className="text-sm font-normal text-slate-400">
              / {data?.maxClassScore || 0} Điểm
            </span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, data?.progressPercentage || 0)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-emerald-600 text-right">
            Đạt {data?.progressPercentage || 0}% mục tiêu lớp
          </p>
        </div>

        {/* Thẻ 3: Hạn nộp gần nhất */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">Hạn nộp</p>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock3 size={19} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">{nearestDeadline}</p>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {assignments.length > 0 ? assignments[0].problemTitle : "Chưa có bài tập"}
          </p>
        </div>
      </section>

      {/* Danh sách bài tập từ Backend */}
      <section
        id="assignments"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Bài tập được giao ({filtered.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Nhấn "Xem chi tiết" để đọc mô tả hoặc "Nộp bài" để gửi file chấm điểm
            </p>
          </div>

          <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-400">
            <Search size={16} />
            <span className="sr-only">Tìm bài tập</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bài tập..."
              className="w-44 bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-sm"
            />
          </label>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((a, index) => {
            const statusInfo =
              statusDisplayMap[a.latestStatus] || statusDisplayMap.NOT_SUBMITTED;

            const isSubmitted = a.attemptCount > 0;
            const isSolved = a.isSolved || a.bestScore >= a.maxPossibleScore;

            // Xác định nhãn trạng thái:
            // Nếu đã từng làm đúng (10đ), luôn giữ trạng thái Đã hoàn thành (màu xanh)
            const displayStatus = !isSubmitted
              ? { text: "Chưa nộp", style: statusDisplayMap.NOT_SUBMITTED.style }
              : isSolved
              ? { text: `Đã hoàn thành (${a.bestScore}đ)`, style: statusDisplayMap.ACCEPTED.style }
              : {
                  text: `${statusInfo.text} (${a.latestScore ?? a.bestScore}đ)`,
                  style: statusInfo.style,
                };

            const deadlineStr = a.deadline
              ? new Date(a.deadline).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              : "Không có";

            return (
              <div
                key={a.assignmentId}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                      Bài {index + 1}
                    </span>
                    {a.attemptCount > 0 && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        • {a.attemptCount} lần nộp
                      </span>
                    )}
                  </div>
                  <h3 className="truncate font-semibold text-slate-900 text-base">
                    {a.problemTitle}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                    <Clock3 size={13} />
                    Hạn nộp: {deadlineStr}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {/* Trạng thái và điểm số */}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${displayStatus.style}`}
                  >
                    {displayStatus.text}
                  </span>

                  {/* Nút Xem lỗi lần nộp gần nhất nếu bài CHƯA hoàn thành và bị lỗi */}
                  {!isSolved && isSubmitted && a.latestStatus !== "ACCEPTED" && (
                    <button
                      onClick={() => handleViewLatestSubmission(a.assignmentId)}
                      disabled={loadingSubmissionId !== null}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                      title="Xem chi tiết lỗi lần nộp gần nhất"
                    >
                      {loadingSubmissionId ? (
                        <Loader2 size={13} className="animate-spin text-rose-600" />
                      ) : (
                        <Eye size={13} />
                      )}
                      <span className="hidden sm:inline">Xem lỗi</span>
                    </button>
                  )}

                  {/* Nút Xem chi tiết đề bài */}
                  <button
                    onClick={() => setSelected(a)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    Đề bài <ChevronRight size={15} />
                  </button>

                  {/* Nút Nộp bài / Nộp lại */}
                  <button
                    onClick={() => setSubmitFor(a)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-blue-200 hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Send size={13} /> {isSubmitted ? "Nộp lại" : "Nộp bài"}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              Không tìm thấy bài tập nào phù hợp với từ khóa "{query}".
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {selected && (
        <DetailModal
          assignment={selected}
          onClose={() => setSelected(null)}
          onSubmit={() => {
            const current = selected;
            setSelected(null);
            setSubmitFor(current);
          }}
          onViewLatestSubmission={handleViewLatestSubmission}
        />
      )}

      {submitFor && (
        <SubmitModal
          assignment={submitFor}
          onClose={() => setSubmitFor(null)}
          onSuccess={() => {
            // Khi nộp bài thành công, tự động load lại tiến độ để cập nhật điểm mới nhất
            fetchProgress(true);
          }}
          onViewDetail={handleOpenSubmissionDetail}
        />
      )}

      {/* Modal xem chi tiết bài nộp & lỗi */}
      <SubmissionDetailModal
        submission={viewSubmissionDetail}
        onClose={() => setViewSubmissionDetail(null)}
      />
    </div>
  );
}
