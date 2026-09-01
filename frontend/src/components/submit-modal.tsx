"use client";

import React, { useState, useRef } from "react";
import { X, Send, CheckCircle2, UploadCloud, FileCode2, Trash2 } from "lucide-react";
import { Assignment } from "@/types";

interface SubmitModalProps {
  assignment: Assignment;
  onClose: () => void;
}

export function SubmitModal({ assignment, onClose }: SubmitModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    // Giả lập gửi bài
    setTimeout(() => {
      setIsSubmitting(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Nộp bài
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {assignment.title}
            </h2>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung */}
        {sent ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
            <h3 className="mt-4 font-semibold text-slate-900 text-lg">
              Đã gửi file bài làm thành công!
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              File <span className="font-semibold text-slate-700">{selectedFile?.name}</span> đã được chuyển đến AI để chấm điểm tự động.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Ẩn input file gốc */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".py,.cpp,.c,.java,.js,.ts,.txt,.pas"
              className="hidden"
            />

            {/* Vùng chọn / kéo thả File */}
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-blue-100/80 text-blue-600 mb-3.5 shadow-sm">
                  <UploadCloud size={28} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Nhấp để tải file lên <span className="font-normal text-slate-500">hoặc kéo thả vào đây</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Hỗ trợ các định dạng: <span className="font-mono text-slate-600">.py, .cpp, .java, .c, .js</span> (Tối đa 2 MB)
                </p>
              </div>
            ) : (
              /* Hiển thị File đã chọn */
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 shadow-sm">
                    <FileCode2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Hệ thống tự động nhận diện ngôn ngữ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                  >
                    Đổi file
                  </button>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Xóa file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              Lưu ý: Đảm bảo code của bạn đọc dữ liệu từ đầu vào chuẩn (Standard Input).
            </p>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={!selectedFile || isSubmitting}
                onClick={handleSubmit}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-sm shadow-blue-200"
              >
                <Send size={15} /> {isSubmitting ? "Đang tải lên..." : "Gửi bài chấm"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
