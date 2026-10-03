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
  ChevronDown,
  Lock,
  Terminal,
  ArrowRight,
  Sparkles,
  Bot,
  Lightbulb,
  RefreshCw,
  Loader2,
  Gauge,
  ShieldAlert,
} from "lucide-react";
import { SubmissionDetailResponse, JudgeStatus, AiReviewData } from "@/types/submission";
import { submissionService } from "@/services/submission.service";

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
  const [activeTab, setActiveTab] = useState<"testcases" | "code" | "ai">(
    "testcases"
  );
  // Quản lý các test case đang được mở rộng chi tiết (mặc định mở test case bị lỗi đầu tiên nếu có)
  const [expandedIds, setExpandedIds] = useState<Record<string | number, boolean>>({});

  // Quản lý trạng thái AI Review
  const [aiReview, setAiReview] = useState<AiReviewData | null>(() => {
    if (submission?.aiFeedback) {
      try {
        return JSON.parse(submission.aiFeedback);
      } catch (e) {
        return {
          summary: submission.aiFeedback,
          timeComplexity: "N/A",
          spaceComplexity: "N/A",
          hints: [submission.aiFeedback],
        };
      }
    }
    return null;
  });
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Cập nhật lại khi prop submission thay đổi
  React.useEffect(() => {
    if (submission?.aiFeedback) {
      try {
        setAiReview(JSON.parse(submission.aiFeedback));
      } catch (e) {
        setAiReview({
          summary: submission.aiFeedback,
          timeComplexity: "N/A",
          spaceComplexity: "N/A",
          hints: [submission.aiFeedback],
        });
      }
    } else {
      setAiReview(null);
    }
    setAiError(null);
  }, [submission?.id, submission?.aiFeedback]);

  const handleFetchAiReview = async (forceRefresh = false) => {
    if (!submission?.id) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await submissionService.getAiReview(submission.id, forceRefresh);
      setAiReview(res.review);
    } catch (err: any) {
      setAiError(err.response?.data?.message || err.message || "Không thể phân tích bài làm.");
    } finally {
      setLoadingAi(false);
    }
  };

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
              {submission.totalScore.toFixed(1)}
              <span className="text-xs font-normal text-slate-400"> / 10.0</span>
            </span>
            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
              ({passedTestCases}/{details.length} tests đạt)
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
          <button
            onClick={() => {
              setActiveTab("ai");
              if (!aiReview && !loadingAi) {
                handleFetchAiReview();
              }
            }}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === "ai"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Sparkles size={14} className={activeTab === "ai" ? "text-purple-600" : "text-purple-400"} /> Trợ giảng AI
            {aiReview && (
              <span className="ml-1 size-1.5 rounded-full bg-purple-500"></span>
            )}
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
                  const itemKey = item.id || idx;
                  const isExpanded = expandedIds[itemKey] ?? !isAC;

                    return (
                      <div
                        key={itemKey}
                        className={`rounded-xl border transition-all ${isAC
                          ? "border-emerald-200 bg-emerald-50/20"
                          : "border-rose-200 bg-rose-50/20"
                          }`}
                      >
                        {/* Header Test case (Clickable Accordion) */}
                        <div
                          onClick={() => toggleExpand(itemKey)}
                          className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-slate-500/5 transition-colors rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </span>
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

                        {/* Nội dung chi tiết khi mở rộng */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-slate-200/70 pt-3 text-xs">
                            {/* 1. Lỗi thực thi / biên dịch / crash nếu có */}
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

                            {/* 2. So sánh Input, Expected, Actual (Nếu có dữ liệu đầu vào hoặc Admin xem) */}
                            {item.testCase?.input != null ? (
                              <div className="space-y-2.5">
                                {/* Dữ liệu đầu vào (Input) */}
                                <div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    <Terminal size={12} className="text-slate-400" />
                                    Đầu vào (Input)
                                    {item.testCase?.isHidden && (
                                      <span className="text-[10px] text-amber-600 lowercase bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-normal">
                                        (test ẩn - chỉ Admin/GV thấy)
                                      </span>
                                    )}
                                  </div>
                                  <pre className="rounded-lg bg-slate-900/95 p-2.5 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                                    {item.testCase.input || "(Đầu vào rỗng)"}
                                  </pre>
                                </div>

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
                                    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1 ${
                                      isAC ? "text-emerald-700" : "text-rose-700"
                                    }`}>
                                      {isAC ? (
                                        <CheckCircle2 size={13} className="text-emerald-600" />
                                      ) : (
                                        <XCircle size={13} className="text-rose-600" />
                                      )}
                                      Kết quả code in ra (Output)
                                    </div>
                                    <pre className={`rounded-lg p-2.5 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all min-h-[52px] ${
                                      isAC
                                        ? "bg-emerald-950/10 border border-emerald-500/20 text-emerald-900"
                                        : "bg-rose-950/20 border border-rose-500/30 text-rose-900"
                                    }`}>
                                      {item.actualOutput != null && item.actualOutput !== ""
                                        ? item.actualOutput
                                        : isAC
                                        ? "(Trùng khớp kết quả kỳ vọng)"
                                        : "(Chương trình không in ra kết quả)"}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 3. Trường hợp Test case ẩn đối với Sinh viên */
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
          {/* TAB 2: SOURCE CODE */}
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

          {/* TAB 3: TRỢ GIẢNG AI (AI CODE REVIEW & HINT) */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Header của Tab AI */}
              <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-200">
                    <Bot size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Trợ giảng AI đánh giá bài nộp
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.2 text-[10px] font-semibold text-purple-700">
                        <Sparkles size={10} /> Gemini 2.5 Flash
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Gợi ý tư duy thuật toán, phân tích độ phức tạp & phát hiện lỗi tiềm ẩn
                    </p>
                  </div>
                </div>

                {/* Nút Phân tích lại (Bỏ qua cache nếu muốn AI nhận xét góc nhìn mới) */}
                {aiReview && !loadingAi && (
                  <button
                    onClick={() => handleFetchAiReview(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 cursor-pointer transition-colors shadow-2xs"
                    title="Yêu cầu AI phân tích lại bài làm này"
                  >
                    <RefreshCw size={12} />
                    <span>Phân tích lại</span>
                  </button>
                )}
              </div>

              {/* Trạng thái 1: Đang tải AI */}
              {loadingAi && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                  <Loader2 className="mx-auto size-8 animate-spin text-purple-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-800">
                    Trợ giảng AI đang đọc hiểu bài làm của bạn...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Đang tính toán độ phức tạp $O(...)$, rà soát lỗi biên và chuẩn bị gợi ý sư phạm.
                  </p>
                </div>
              )}

              {/* Trạng thái 2: Lỗi gọi AI */}
              {!loadingAi && aiError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-rose-700 font-semibold text-sm mb-1">
                    <ShieldAlert size={16} />
                    <span>Không thể hoàn tất phân tích</span>
                  </div>
                  <p className="text-xs text-rose-600 mb-3">{aiError}</p>
                  <button
                    onClick={() => handleFetchAiReview(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} /> Thử lại
                  </button>
                </div>
              )}

              {/* Trạng thái 3: Chưa có nhận xét & không loading */}
              {!loadingAi && !aiReview && !aiError && (
                <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/30 p-10 text-center">
                  <Bot className="mx-auto size-12 text-purple-400 mb-3" />
                  <h5 className="text-sm font-bold text-slate-800">
                    Bài nộp chưa có nhận xét từ AI
                  </h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Nhấn nút bên dưới để Trợ giảng AI phân tích chi tiết độ phức tạp thuật toán, gợi ý cách khắc phục lỗi mà không làm lộ đáp án.
                  </p>
                  <button
                    onClick={() => handleFetchAiReview(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} /> Phân tích bài làm cùng AI
                  </button>
                </div>
              )}

              {/* Trạng thái 4: Đã có nhận xét (Từ DB hoặc vừa phân tích xong) */}
              {!loadingAi && aiReview && (
                <div className="space-y-3.5">
                  {/* Khối 1: Tóm tắt nhận xét */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <Sparkles size={13} className="text-purple-600" />
                      Nhận xét tổng quan
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      {aiReview.summary}
                    </p>
                  </div>

                  {/* Khối 2: Độ phức tạp thuật toán & Clean code score */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        <Clock3 size={13} className="text-blue-600" />
                        Độ phức tạp thời gian
                      </div>
                      <div className="text-base font-mono font-bold text-blue-700">
                        {aiReview.timeComplexity}
                      </div>
                      {aiReview.complexityExplanation && (
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {aiReview.complexityExplanation}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        <Cpu size={13} className="text-indigo-600" />
                        Độ phức tạp không gian
                      </div>
                      <div className="text-base font-mono font-bold text-indigo-700">
                        {aiReview.spaceComplexity}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Bộ nhớ phụ sử dụng trong suốt quá trình chạy.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        <Gauge size={13} className="text-emerald-600" />
                        Điểm Clean Code
                      </div>
                      <div className="text-base font-bold text-emerald-700">
                        {aiReview.cleanCodeScore ?? 80} / 100
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        Đánh giá phong cách code & cấu trúc giải thuật.
                      </p>
                    </div>
                  </div>

                  {/* Khối 3: Gợi ý tư duy (Hints) - Không spoil */}
                  {aiReview.hints && aiReview.hints.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
                        <Lightbulb size={14} className="text-amber-600" />
                        Gợi ý cải thiện thuật toán (Hints)
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                        {aiReview.hints.map((hint, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-medium text-slate-800">{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Khối 4: Trường hợp biên (Edge Cases) */}
                  {aiReview.edgeCases && aiReview.edgeCases.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        <AlertTriangle size={13} className="text-orange-500" />
                        Các trường hợp biên cần lưu ý (Corner Cases)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiReview.edgeCases.map((ec, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700 flex items-start gap-2"
                          >
                            <span className="text-orange-500 font-bold">•</span>
                            <span>{ec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Khối 5: Lời khuyên viết code sạch (Clean Code Tips) */}
                  {aiReview.cleanCodeTips && aiReview.cleanCodeTips.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Lời khuyên tối ưu mã nguồn (Best Practices)
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                        {aiReview.cleanCodeTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
