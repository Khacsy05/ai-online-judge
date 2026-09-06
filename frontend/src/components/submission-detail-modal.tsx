"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock3,
  Cpu,
  Code2,
  Copy,
  Check,
  FileCode,
  AlertTriangle,
  ChevronRight,
  Lock,
  Terminal,
  ArrowRight,
} from "lucide-react";
import { SubmissionDetailResponse, JudgeStatus } from "@/types/submission";

interface SubmissionDetailModalProps {
  submission: SubmissionDetailResponse | null;
  onClose: () => void;
}

const statusBadgeMap: Record<
  string,
  { text: string; bg: string; textCol: string; borderCol: string }
> = {
  ACCEPTED: {
    text: "Đã hoàn thành (AC)",
    bg: "bg-emerald-50",
    textCol: "text-emerald-700",
    borderCol: "border-emerald-200",
  },
  WRONG_ANSWER: {
    text: "Sai kết quả (WA)",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
  },
  TIME_LIMIT_EXCEEDED: {
    text: "Quá thời gian (TLE)",
    bg: "bg-amber-50",
    textCol: "text-amber-700",
    borderCol: "border-amber-200",
  },
  MEMORY_LIMIT_EXCEEDED: {
    text: "Tràn bộ nhớ (MLE)",
    bg: "bg-amber-50",
    textCol: "text-amber-700",
    borderCol: "border-amber-200",
  },
  RUNTIME_ERROR: {
    text: "Lỗi thực thi (RTE)",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
  },
  COMPILATION_ERROR: {
    text: "Lỗi biên dịch (CE)",
    bg: "bg-rose-50",
    textCol: "text-rose-700",
    borderCol: "border-rose-200",
  },
  PENDING: {
    text: "Đang chờ chấm",
    bg: "bg-slate-100",
    textCol: "text-slate-700",
    borderCol: "border-slate-200",
  },
  RUNNING: {
    text: "Đang chấm",
    bg: "bg-blue-50",
    textCol: "text-blue-700",
    borderCol: "border-blue-200",
  },
  CANCELLED: {
    text: "Đã hủy",
    bg: "bg-slate-100",
    textCol: "text-slate-500",
    borderCol: "border-slate-200",
  },
};

export function SubmissionDetailModal({
  submission,
  onClose,
}: SubmissionDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"testcases" | "code">(
    "testcases"
  );

  if (!submission) return null;

  const statusConfig = statusBadgeMap[submission.status] || {
    text: submission.status,
    bg: "bg-slate-100",
    textCol: "text-slate-700",
    borderCol: "border-slate-200",
  };

  const handleCopyCode = () => {
    if (submission.sourceCode) {
      navigator.clipboard.writeText(submission.sourceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const details = submission.details || [];
  const passedTestCases = details.filter((d) => d.status === "ACCEPTED").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.bg} ${statusConfig.textCol} ${statusConfig.borderCol}`}
              >
                {statusConfig.text}
              </span>
              <span className="text-xs font-mono uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold border border-slate-200">
                {submission.language}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(submission.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {submission.assignment?.problem?.title || "Chi tiết bài nộp"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã nộp bài:{" "}
              <span className="font-mono text-slate-700">{submission.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thông số tổng quan (Metrics Card Bar) */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-center">
          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-medium block">
              Điểm số
            </span>
            <span className="text-lg font-bold text-slate-900">
              {submission.totalScore}
              <span className="text-xs font-normal text-slate-400"> / 10.0</span>
            </span>
          </div>
          <div className="p-2 border-x border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center justify-center gap-1">
              <Clock3 size={11} /> Thời gian chạy
            </span>
            <span className="text-base font-semibold text-slate-800">
              {submission.executionTimeMs ?? 0} ms
            </span>
          </div>
          <div className="p-2">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center justify-center gap-1">
              <Cpu size={11} /> Bộ nhớ sử dụng
            </span>
            <span className="text-base font-semibold text-slate-800">
              {submission.memoryUsedKb
                ? `${(submission.memoryUsedKb / 1024).toFixed(1)} MB`
                : "0 MB"}
            </span>
          </div>
        </div>

        {/* Tabs Điều hướng nội dung */}
        <div className="flex border-b border-slate-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab("testcases")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === "testcases"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <CheckCircle2 size={14} /> Test cases ({passedTestCases}/
            {details.length})
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === "code"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Code2 size={14} /> Mã nguồn nộp
          </button>
        </div>

        {/* Nội dung theo Tab (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800">
          {/* TAB 1: TEST CASES */}
          {activeTab === "testcases" && (
            <div className="space-y-3">
              {details.length > 0 ? (
                details.map((item, idx) => {
                  const isAC = item.status === "ACCEPTED";
                  const detailBadge = statusBadgeMap[item.status] || {
                    text: item.status,
                    bg: "bg-slate-100",
                    textCol: "text-slate-600",
                    borderCol: "border-slate-200",
                  };

                  return (
                    <div
                      key={item.id || idx}
                      className={`rounded-xl border p-4 transition-all ${isAC
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-rose-200 bg-rose-50/20"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">
                            Test case #{idx + 1}
                          </span>
                          {item.testCase?.isHidden && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                              <Lock size={10} /> Ẩn
                            </span>
                          )}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${detailBadge.bg} ${detailBadge.textCol} ${detailBadge.borderCol}`}
                          >
                            {detailBadge.text}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          {item.executionTimeMs != null && (
                            <span>{item.executionTimeMs} ms</span>
                          )}
                          <span className="font-semibold text-slate-700">
                            +{item.score} điểm
                          </span>
                        </div>
                      </div>

                      {/* Hiển thị lỗi hoặc so sánh kết quả nếu test case không AC */}
                      {!isAC && (
                        <div className="mt-3 space-y-3 border-t border-slate-200/70 pt-3 text-xs">
                          {/* 1. Lỗi thực thi / biên dịch / crash */}
                          {item.errorMessage && (
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-rose-600 mb-1.5">
                                <AlertTriangle size={14} />
                                <span>Chi tiết lỗi / Ngoại lệ (Runtime / Compile Error):</span>
                              </div>
                              <pre className="rounded-lg bg-slate-900 p-3 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                {item.errorMessage}
                              </pre>
                            </div>
                          )}

                          {/* 2. Trường hợp Test case công khai (Public): So sánh Input, Expected, Actual */}
                          {!item.testCase?.isHidden ? (
                            <div className="space-y-2.5">
                              {/* Dữ liệu đầu vào (Input) */}
                              {item.testCase?.input != null && (
                                <div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    <Terminal size={12} className="text-slate-400" />
                                    Đầu vào (Input)
                                  </div>
                                  <pre className="rounded-lg bg-slate-900/95 p-2.5 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                                    {item.testCase.input || "(Đầu vào rỗng)"}
                                  </pre>
                                </div>
                              )}

                              {/* So sánh 2 khối song song: Kết quả kỳ vọng vs Kết quả chương trình */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {/* Kỳ vọng */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                                    <CheckCircle2 size={13} className="text-emerald-600" />
                                    Kết quả kỳ vọng (Expected Output)
                                  </div>
                                  <pre className="rounded-lg bg-emerald-950/20 border border-emerald-500/30 p-2.5 font-mono text-xs text-emerald-900 overflow-x-auto whitespace-pre-wrap break-all min-h-[52px]">
                                    {item.testCase?.expectedOutput != null
                                      ? item.testCase.expectedOutput
                                      : "(Không có đáp án mẫu)"}
                                  </pre>
                                </div>

                                {/* Thực tế code in ra */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-1">
                                    <XCircle size={13} className="text-rose-600" />
                                    Kết quả code in ra (Your Output)
                                  </div>
                                  <pre className="rounded-lg bg-rose-950/20 border border-rose-500/30 p-2.5 font-mono text-xs text-rose-900 overflow-x-auto whitespace-pre-wrap break-all min-h-[52px]">
                                    {item.actualOutput != null && item.actualOutput !== ""
                                      ? item.actualOutput
                                      : "(Chương trình không in ra kết quả)"}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* 3. Trường hợp Test case ẩn (Hidden): Bảo mật dữ liệu, giải thích rõ */
                            <div className="rounded-lg border border-dashed border-amber-200/90 bg-amber-50/50 p-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                                <Lock size={14} className="text-amber-600 shrink-0" />
                                <span>Đây là test case ẩn của bài tập</span>
                              </div>
                              <p className="text-[11px] text-amber-700 leading-normal">
                                Dữ liệu đầu vào và kết quả kỳ vọng được ẩn để kiểm tra tư duy tổng quát của thuật toán và chống hardcode kết quả.
                              </p>

                              {item.actualOutput && (
                                <div className="mt-2 pt-2 border-t border-amber-200/50">
                                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                                    Kết quả chương trình của bạn đã in ra:
                                  </span>
                                  <pre className="rounded-lg bg-white border border-slate-200 p-2.5 font-mono text-xs text-slate-800 overflow-x-auto whitespace-pre-wrap break-all">
                                    {item.actualOutput}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Không có dữ liệu test case chi tiết.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOURCE CODE */}
          {activeTab === "code" && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <FileCode size={14} /> Mã nguồn nộp ({submission.language})
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-600" />
                      <span className="text-emerald-600">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner overflow-x-auto max-h-96">
                <pre className="leading-relaxed whitespace-pre font-mono">
                  {submission.sourceCode || "// Không tìm thấy mã nguồn"}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex justify-end border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
