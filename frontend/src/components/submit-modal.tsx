"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  CheckCircle2,
  XCircle,
  UploadCloud,
  FileCode2,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
  RotateCcw,
  Eye,
  Clock3,
  Cpu,
} from "lucide-react";
import { Assignment } from "@/types";
import { submitCode, getSubmissionById } from "@/services/submission.service";
import {
  Submission,
  GradingFinishedEvent,
  JudgeStatus,
} from "@/types/submission";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { getSocket } from "@/lib/socket";

interface SubmitModalProps {
  assignment: Assignment;
  onClose: () => void;
  onSuccess?: () => void;
  onViewDetail?: (submissionId: string) => void;
}

type SubmitStep = "UPLOAD" | "GRADING" | "RESULT";

const statusConfigMap: Record<
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
};

export function SubmitModal({
  assignment,
  onClose,
  onSuccess,
  onViewDetail,
}: SubmitModalProps) {
  const userId = useAuthStore((state) => state.userId);
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState<SubmitStep>("UPLOAD");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dữ liệu bài nộp & kết quả chấm live
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(
    null
  );
  const [gradingResult, setGradingResult] = useState<GradingFinishedEvent | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Giữ ref cho currentSubmission và onSuccess để callback của socket luôn đọc giá trị mới nhất
  const currentSubmissionRef = useRef(currentSubmission);
  currentSubmissionRef.current = currentSubmission;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Lắng nghe sự kiện AI chấm bài xong từ Socket.io singleton
  useEffect(() => {
    const currentUserId = userId || user?.id;
    if (!currentUserId) return;

    const socket = getSocket(currentUserId);
    if (!socket) return;

    const handleGradingFinished = (event: GradingFinishedEvent) => {
      // Chỉ nhận kết quả đúng bài nộp hiện tại trong Modal này
      if (
        currentSubmissionRef.current &&
        event.submissionId === currentSubmissionRef.current.id
      ) {
        setGradingResult(event);
        setStep("RESULT");
        useSubmissionStore.getState().updateSubmissionRealtime(event);
        if (onSuccessRef.current) onSuccessRef.current();
      }
    };

    socket.on("gradingFinished", handleGradingFinished);

    return () => {
      socket.off("gradingFinished", handleGradingFinished);
    };
  }, [userId, user?.id]);

  // Fallback Polling phòng khi Socket bị rớt mạng
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (step === "GRADING" && currentSubmission && !gradingResult) {
      let attempts = 0;
      timer = setInterval(async () => {
        attempts++;
        try {
          const detail = await getSubmissionById(currentSubmission.id);
          if (
            detail.status !== "PENDING" &&
            detail.status !== "RUNNING" &&
            detail.status !== "CANCELLED"
          ) {
            setGradingResult({
              submissionId: detail.id,
              assignmentId: detail.assignmentId,
              classroomId: detail.assignment?.classroomId || "",
              status: detail.status,
              totalScore: detail.totalScore,
              executionTimeMs: detail.executionTimeMs || 0,
              memoryUsedKb: detail.memoryUsedKb || 0,
              feedback: detail.feedback || "",
              studentTotalScore: 0,
              maxClassScore: 0,
              totalAssignments: 0,
              solvedCount: 0,
              progressPercentage: 0,
            });
            setStep("RESULT");
            if (onSuccess) onSuccess();
            if (timer) clearInterval(timer);
          }
        } catch (e) {
          // Bỏ qua lỗi polling
        }

        // Sau 20 giây nếu vẫn chưa có kết quả thì dừng polling
        if (attempts > 10 && timer) {
          clearInterval(timer);
        }
      }, 2000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, currentSubmission, gradingResult, onSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setErrorMsg(null);
    setStep("GRADING");

    try {
      // 1. Gửi file lên API NestJS Backend
      const submission = await submitCode(
        selectedFile,
        assignment.assignmentId
      );
      setCurrentSubmission(submission);
      useSubmissionStore.getState().invalidateCache();

      // Nếu bài nộp đã được chấm luôn (hoặc trả về ngay kết quả)
      if (
        submission.status !== "PENDING" &&
        submission.status !== "RUNNING"
      ) {
        setGradingResult({
          submissionId: submission.id,
          assignmentId: submission.assignmentId,
          classroomId: "",
          status: submission.status,
          totalScore: submission.totalScore,
          executionTimeMs: submission.executionTimeMs || 0,
          memoryUsedKb: submission.memoryUsedKb || 0,
          feedback: submission.feedback || "",
          studentTotalScore: 0,
          maxClassScore: 0,
          totalAssignments: 0,
          solvedCount: 0,
          progressPercentage: 0,
        });
        setStep("RESULT");
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setStep("UPLOAD");
      setErrorMsg(err.message || "Gửi bài chấm thất bại. Vui lòng thử lại.");
    }
  };

  const handleResetForRetry = () => {
    setSelectedFile(null);
    setCurrentSubmission(null);
    setGradingResult(null);
    setErrorMsg(null);
    setStep("UPLOAD");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const statusConfig = gradingResult
    ? statusConfigMap[gradingResult.status] || {
        text: gradingResult.status,
        bg: "bg-slate-100",
        textCol: "text-slate-700",
        borderCol: "border-slate-200",
      }
    : null;

  const isAccepted = gradingResult?.status === "ACCEPTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                Nộp bài giải
              </span>
              <span className="text-xs text-slate-400">
                Điểm tối đa: {assignment.maxPossibleScore}đ
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {assignment.problemTitle}
            </h2>
          </div>
          {step !== "GRADING" && (
            <button
              aria-label="Đóng"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* BƯỚC 1: CHỌN VÀ TẢI FILE CODE */}
        {step === "UPLOAD" && (
          <div className="space-y-5 p-6">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-600 border border-rose-100">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".cpp,.cc,.cxx,.py,.java,.js,.ts,.go"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-blue-600 shadow-2xs mb-3">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Nhấn để chọn file bài làm hoặc kéo thả vào đây
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Hỗ trợ các định dạng: .cpp, .py, .java, .js, .ts, .go
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/75">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <FileCode2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng nộp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-lg p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Xóa file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* Footer Nộp bài */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} /> Gửi bài làm
              </button>
            </div>
          </div>
        )}

        {/* BƯỚC 2: ĐANG CHẤM BÀI BẰNG AI (LIVE GRADING) */}
        {step === "GRADING" && (
          <div className="p-10 text-center space-y-4">
            <div className="relative mx-auto flex size-20 items-center justify-center rounded-full bg-blue-50 border-2 border-blue-200 animate-pulse">
              <Sparkles size={32} className="text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Hệ thống AI đang chấm bài...
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Mã nguồn của bạn đang được biên dịch trong môi trường sandbox an toàn và chạy qua toàn bộ các test cases. Kết quả sẽ hiển thị ngay khi hoàn tất!
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Loader2 size={12} className="animate-spin text-blue-600" />
              <span>Đang kết nối hàng đợi chấm...</span>
            </div>
          </div>
        )}

        {/* BƯỚC 3: KẾT QUẢ TỨC THÌ (ACCEPTED HOẶC HIỆN LỖI CHI TIẾT) */}
        {step === "RESULT" && gradingResult && (
          <div className="p-6 space-y-5">
            {/* Header Kết quả: Điểm & Trạng thái */}
            <div
              className={`rounded-2xl border p-5 ${
                isAccepted
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-rose-200 bg-rose-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isAccepted ? (
                    <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <XCircle size={24} />
                    </div>
                  )}
                  <div>
                    <span
                      className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-bold ${statusConfig?.bg} ${statusConfig?.textCol} ${statusConfig?.borderCol}`}
                    >
                      {statusConfig?.text}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {isAccepted
                        ? "Chúc mừng! Bạn đã giải thành công"
                        : "Bài làm chưa đạt điểm tối đa"}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">
                    {gradingResult.totalScore.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400"> / 10.0đ</span>
                </div>
              </div>

              {/* Metrics: Thời gian và Bộ nhớ */}
              <div className="mt-3.5 flex items-center gap-4 border-t border-slate-200/60 pt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-mono">
                  <Clock3 size={13} className="text-slate-400" />
                  {gradingResult.executionTimeMs} ms
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Cpu size={13} className="text-slate-400" />
                  {(gradingResult.memoryUsedKb / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>

            {/* Hộp Nhận xét & Đánh giá của AI */}
            {gradingResult.feedback && (
              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                  <Sparkles size={14} className="text-blue-600" /> Nhận xét từ AI Chấm Điểm
                </div>
                <p className="text-xs leading-relaxed text-slate-700 font-sans whitespace-pre-wrap">
                  {gradingResult.feedback}
                </p>
              </div>
            )}

            {/* Nút Hành động */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForRetry}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw size={14} /> Chọn file nộp lại
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                {onViewDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewDetail(gradingResult.submissionId);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Eye size={14} /> Xem chi tiết test cases
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
