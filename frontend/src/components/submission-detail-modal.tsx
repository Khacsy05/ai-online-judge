"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<"feedback" | "testcases" | "code">(
    "feedback"
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
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "feedback"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles size={14} /> Phản hồi từ AI
          </button>
          <button
            onClick={() => setActiveTab("testcases")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "testcases"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CheckCircle2 size={14} /> Test cases ({passedTestCases}/
            {details.length})
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "code"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code2 size={14} /> Mã nguồn nộp
          </button>
        </div>

        {/* Nội dung theo Tab (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800">
          {/* TAB 1: AI FEEDBACK */}
          {activeTab === "feedback" && (
            <div className="space-y-4">
              {submission.feedback ? (
                <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-2.5">
                    <Sparkles size={16} className="text-blue-600" /> Nhận xét & Đánh giá chi tiết
                  </div>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                    {submission.feedback}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
                  Chưa có nhận xét nào cho bài nộp này.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEST CASES */}
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
                      className={`rounded-xl border p-4 transition-all ${
                        isAC
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
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              Ẩn
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

                      {/* Hiển thị lỗi hoặc output nếu test case thất bại */}
                      {!isAC && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 text-xs">
                          {item.errorMessage && (
                            <div>
                              <span className="font-medium text-rose-600 block mb-1">
                                Lỗi thực thi / biên dịch:
                              </span>
                              <pre className="rounded-lg bg-slate-900 p-2.5 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                                {item.errorMessage}
                              </pre>
                            </div>
                          )}
                          {item.actualOutput && (
                            <div>
                              <span className="font-medium text-slate-600 block mb-1">
                                Kết quả chương trình in ra:
                              </span>
                              <pre className="rounded-lg bg-slate-100 p-2 font-mono text-[11px] overflow-x-auto text-slate-700">
                                {item.actualOutput}
                              </pre>
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
