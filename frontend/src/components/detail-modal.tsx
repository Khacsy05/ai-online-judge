"use client";

import React from "react";
import { X, Send, FileCode } from "lucide-react";
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
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {assignment.code}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {assignment.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Hạn nộp: {assignment.due}
            </p>
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
            <p className="text-sm leading-6 text-slate-600">
              {assignment.description}
            </p>
          </div>

          {/* Yêu cầu */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Yêu cầu kỹ thuật
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
              {assignment.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Test cases có header Input / Output rõ ràng */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCode size={16} className="text-blue-600" />
                Test case công khai (Public Testcases)
              </h3>
              <span className="text-xs text-slate-400">
                {assignment.tests.length} trường hợp mẫu
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* Tiêu đề cột Input và Output */}
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

              {/* Dữ liệu từng test case */}
              {assignment.tests.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 border-b border-slate-100 last:border-0"
                >
                  <div className="bg-slate-50/70 p-3.5 font-mono text-xs text-slate-700 border-r border-slate-100 whitespace-pre-wrap break-all">
                    {t.input}
                  </div>
                  <div className="p-3.5 font-mono text-xs text-blue-700 font-semibold whitespace-pre-wrap break-all bg-white">
                    {t.output}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={onSubmit}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
          >
            <Send size={15} /> Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
}
