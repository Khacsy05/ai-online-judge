"use client";

import React from "react";
import { X, Send, FileCode, Clock, Cpu, Eye, AlertCircle, CheckCircle2 } from "lucide-react";
import { Assignment } from "@/types";

interface DetailModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSubmit: () => void;
  onViewLatestSubmission?: (assignmentId: string) => void;
}

export function DetailModal({
  assignment,
  onClose,
  onSubmit,
  onViewLatestSubmission,
}: DetailModalProps) {
  const deadlineStr = assignment.deadline
    ? new Date(assignment.deadline).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "Không giới hạn";

  const publicTests = assignment.testCases || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Bài tập
              </span>
              <span className="text-xs text-slate-400">
                Điểm tối đa: {assignment.maxPossibleScore}đ
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {assignment.problemTitle}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-slate-400" />
                Hạn nộp: <strong className="text-slate-700">{deadlineStr}</strong>
              </span>
              {assignment.timeLimitMs && (
                <span>Thời gian: {assignment.timeLimitMs}ms</span>
              )}
              {assignment.memoryLimitMb && (
                <span className="flex items-center gap-1">
                  <Cpu size={13} className="text-slate-400" />
                  Bộ nhớ: {assignment.memoryLimitMb}MB
                </span>
              )}
            </div>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Lần nộp & Thành tích (nếu đã từng nộp bài này) */}
          {assignment.attemptCount > 0 && assignment.latestStatus !== "NOT_SUBMITTED" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 divide-y divide-slate-200/70">
              {/* Dòng 1: Thành tích cao nhất của bài tập */}
              <div className="pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Thành tích cao nhất
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-bold text-slate-900">
                      {assignment.bestScore} / {assignment.maxPossibleScore} điểm
                    </span>
                    {assignment.isSolved || assignment.bestScore >= assignment.maxPossibleScore ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Đã hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Chưa hoàn thành
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      • Đã nộp {assignment.attemptCount} lần
                    </span>
                  </div>
                </div>
              </div>

              {/* Dòng 2: Lần nộp gần nhất */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Kết quả lần nộp gần nhất (Lần #{assignment.attemptCount})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${assignment.latestStatus === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : assignment.latestStatus === "WRONG_ANSWER"
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                    >
                      {assignment.latestStatus === "ACCEPTED" ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Chính xác (ACCEPTED)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} className="text-rose-600" />
                          <span>{assignment.latestStatus}</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      Điểm lần này: <strong>{assignment.latestScore ?? (assignment.latestStatus === "ACCEPTED" ? assignment.bestScore : 0)} / {assignment.maxPossibleScore}đ</strong>
                    </span>
                  </div>
                </div>

                {onViewLatestSubmission && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewLatestSubmission(assignment.assignmentId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                  >
                    <Eye size={13} />
                    <span>Xem lỗi & chi tiết lần nộp</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mô tả */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Mô tả đề bài
            </h3>
            <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
              {assignment.problemDescription || "Chưa có mô tả chi tiết."}
            </div>
          </div>

          {/* Test cases công khai */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCode size={16} className="text-blue-600" />
                Ví dụ đầu vào / đầu ra mẫu (Public Testcases)
              </h3>
              <span className="text-xs text-slate-400">
                {publicTests.length} trường hợp mẫu
              </span>
            </div>

            {publicTests.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-400" />
                    Đầu vào (Input)
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <span className="size-2 rounded-full bg-blue-500" />
                    Đầu ra kỳ vọng (Expected Output)
                  </div>
                </div>

                {publicTests.map((t, i) => (
                  <div
                    key={t.id || i}
                    className="grid grid-cols-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="bg-slate-50/70 p-3.5 font-mono text-xs text-slate-700 border-r border-slate-100 whitespace-pre-wrap break-all">
                      {t.input}
                    </div>
                    <div className="p-3.5 font-mono text-xs text-blue-700 font-semibold whitespace-pre-wrap break-all bg-white">
                      {t.expectedOutput}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có testcase công khai cho bài tập này.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 p-5 bg-slate-50/50">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={onSubmit}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer shadow-sm shadow-blue-200"
          >
            <Send size={15} /> Nộp bài ngay
          </button>
        </div>
      </div>
    </div>
  );
}
