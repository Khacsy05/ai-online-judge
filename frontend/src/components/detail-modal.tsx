"use client";

import React from "react";
import { X, Send, FileCode, Clock, Cpu } from "lucide-react";
import { Assignment } from "@/types";

interface DetailModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSubmit: () => void;
}

export function DetailModal({
  assignment,
  onClose,
  onSubmit,
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
