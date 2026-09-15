"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  FileCode2,
  Plus,
  Search,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  X,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Code,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getProblems,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem,
  ProblemItem,
  TestCaseItem,
} from "@/services/problem.service";
import { toast } from "sonner";

interface FormTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export default function AdminProblemsPage() {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Thêm / Sửa bài tập
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTimeLimit, setFormTimeLimit] = useState(1000);
  const [formMemoryLimit, setFormMemoryLimit] = useState(256);
  const [formTestCases, setFormTestCases] = useState<FormTestCase[]>([
    { input: "", expectedOutput: "", isHidden: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProblemDetail, setLoadingProblemDetail] = useState(false);

  // Modal Xem chi tiết bài tập & Testcases
  const [previewProblem, setPreviewProblem] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Modal Xác nhận xóa bài tập
  const [deleteTarget, setDeleteTarget] = useState<ProblemItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Phân trang từ Backend
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalProblems, setTotalProblems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Tải danh sách bài tập từ Backend kèm phân trang
  const fetchProblemsList = async (page = currentPage, limit = pageSize, search = searchQuery) => {
    try {
      setLoading(true);
      const data = await getProblems({ page, limit, search });
      if (data && Array.isArray(data.items)) {
        setProblems(data.items);
        setTotalProblems(data.total);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        // Fallback
        setProblems(data);
        setTotalProblems((data as any[]).length);
        setTotalPages(Math.ceil((data as any[]).length / limit) || 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách bài tập.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblemsList(currentPage, pageSize, searchQuery);
  }, [currentPage, pageSize]);

  // Khi tìm kiếm thay đổi, reset về trang 1 và tải
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchProblemsList(1, pageSize, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Mở Modal Tạo mới
  const handleOpenCreate = () => {
    setEditingProblemId(null);
    setFormTitle("");
    setFormDescription("");
    setFormTimeLimit(1000);
    setFormMemoryLimit(256);
    setFormTestCases([{ input: "", expectedOutput: "", isHidden: false }]);
    setShowFormModal(true);
  };

  // 3. Mở Modal Chỉnh sửa
  const handleOpenEdit = async (p: ProblemItem) => {
    setEditingProblemId(p.id);
    setFormTitle(p.title);
    setFormDescription(p.description || "");
    setFormTimeLimit(p.timeLimitMs || 1000);
    setFormMemoryLimit(p.memoryLimitMb || 256);
    setShowFormModal(true);

    try {
      setLoadingProblemDetail(true);
      const detail = await getProblemById(p.id);
      if (detail.testCases && detail.testCases.length > 0) {
        setFormTestCases(
          detail.testCases.map((tc) => ({
            input: tc.input || "",
            expectedOutput: tc.expectedOutput || "",
            isHidden: !!tc.isHidden,
          }))
        );
      } else {
        setFormTestCases([{ input: "", expectedOutput: "", isHidden: false }]);
      }
    } catch (err) {
      toast.error("Không thể tải chi tiết test cases.");
    } finally {
      setLoadingProblemDetail(false);
    }
  };

  // 4. Mở Modal Xem trước
  const handleOpenPreview = async (p: ProblemItem) => {
    try {
      setLoadingPreview(true);
      const detail = await getProblemById(p.id);
      setPreviewProblem(detail);
    } catch (err) {
      toast.error("Không thể tải thông tin bài tập.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Quản lý danh sách Testcase trong Form
  const addTestCase = () => {
    setFormTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", isHidden: prev.length > 0 },
    ]);
  };

  const removeTestCase = (index: number) => {
    if (formTestCases.length <= 1) {
      toast.error("Bài tập cần ít nhất 1 test case mẫu.");
      return;
    }
    setFormTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTestCase = (
    index: number,
    field: keyof FormTestCase,
    value: any
  ) => {
    setFormTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
  };

  // 5. Submit Form Tạo / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài tập.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        timeLimitMs: Number(formTimeLimit),
        memoryLimitMb: Number(formMemoryLimit),
        testCases: formTestCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        })),
      };

      if (editingProblemId) {
        await updateProblem(editingProblemId, payload);
        toast.success("Cập nhật bài tập thành công!");
      } else {
        await createProblem(payload);
        toast.success("Tạo bài tập mới thành công!");
      }

      setShowFormModal(false);
      fetchProblemsList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Xử lý Xóa bài tập
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteProblem(deleteTarget.id);
      toast.success(`Đã xóa bài tập "${deleteTarget.title}" thành công!`);
      setDeleteTarget(null);
      fetchProblemsList();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa bài tập.");
    } finally {
      setDeleting(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Header trang */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              <Code size={14} className="text-indigo-600" /> Ngân hàng Đề bài
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Quản lý Bài tập
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo, cấu hình giới hạn thực thi và quản lý bộ Test Cases cho các bài tập lập trình.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProblemsList()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Tạo bài tập mới</span>
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm & Số lượng */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề bài tập..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Tổng số <span className="font-bold text-slate-900">{totalProblems}</span> bài tập
        </p>
      </div>

      {/* Danh sách bài tập (Table hoặc Empty) */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-8 animate-spin text-indigo-600" />
          <p className="text-xs font-medium text-slate-400">Đang tải danh sách bài tập...</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileCode2 size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Chưa có bài tập nào</h3>
          <p className="max-w-sm text-xs text-slate-400">
            Hãy bắt đầu tạo bài tập đầu tiên để giao cho các lớp học làm bài chấm tự động.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Tạo bài tập ngay</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Tiêu đề bài tập</th>
                  <th className="px-4 py-3.5">Giới hạn tài nguyên</th>
                  <th className="px-4 py-3.5 text-center">Test cases</th>
                  <th className="px-4 py-3.5 text-center">Đang giao</th>
                  <th className="px-4 py-3.5">Tác giả</th>
                  <th className="px-5 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {problems.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <FileCode2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {p.description || "Chưa có mô tả"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 font-mono text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {p.timeLimitMs} ms
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={12} className="text-slate-400" />
                          {p.memoryLimitMb} MB
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                        {p._count?.testCases || 0}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                        {p._count?.assignments || 0} lớp
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-800">
                        {p.author?.fullName || "Quản trị viên"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPreview(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Xem chi tiết & Test cases"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                          title="Chỉnh sửa bài tập"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Xóa bài tập"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thanh điều hướng phân trang */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={5}>5 bài / trang</option>
                <option value={8}>8 bài / trang</option>
                <option value={10}>10 bài / trang</option>
                <option value={20}>20 bài / trang</option>
              </select>
              <span>
                (từ{" "}
                <strong className="text-slate-800">
                  {totalProblems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </strong>{" "}
                -{" "}
                <strong className="text-slate-800">
                  {Math.min(currentPage * pageSize, totalProblems)}
                </strong>{" "}
                trong tổng số <strong className="text-slate-800">{totalProblems}</strong> bài)
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {/* Nút trang trước */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              {/* Danh sách các nút số trang */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Chỉ hiển thị các trang gần trang hiện tại nếu nhiều trang
                    return (
                      totalPages <= 7 ||
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const isJump = prevPage && page - prevPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {isJump && (
                          <span className="px-1 text-xs text-slate-400 font-mono">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`size-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${currentPage === page
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* Nút trang sau */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 1: TẠO / CHỈNH SỬA BÀI TẬP ===================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FileCode2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingProblemId ? "Chỉnh sửa bài tập" : "Tạo bài tập mới"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cấu hình thông tin đề bài, giới hạn tài nguyên và bộ test cases.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingProblemDetail ? (
                <div className="flex py-12 items-center justify-center text-xs text-slate-400 gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  Đang tải thông tin chi tiết bài tập...
                </div>
              ) : (
                <>
                  {/* 1. Thông tin chung */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      1. Thông tin chung
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tiêu đề bài tập <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Tính tổng hai số A và B..."
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" /> Giới hạn thời gian (ms)
                        </label>
                        <input
                          type="number"
                          required
                          min={100}
                          max={10000}
                          step={100}
                          value={formTimeLimit}
                          onChange={(e) => setFormTimeLimit(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <HardDrive size={13} className="text-slate-400" /> Giới hạn bộ nhớ (MB)
                        </label>
                        <input
                          type="number"
                          required
                          min={16}
                          max={2048}
                          step={16}
                          value={formMemoryLimit}
                          onChange={(e) => setFormMemoryLimit(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Mô tả đề bài / Yêu cầu
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Mô tả chi tiết đề bài, định dạng đầu vào (Input) và đầu ra (Output)..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  {/* 2. Cấu hình Test Cases */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          2. Bộ Test Cases ({formTestCases.length})
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Test case không ẩn sẽ được hiển thị công khai cho sinh viên xem ví dụ mẫu.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addTestCase}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Thêm Test Case</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formTestCases.map((tc, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              Test case #{index + 1}
                            </span>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tc.isHidden}
                                  onChange={(e) =>
                                    updateTestCase(index, "isHidden", e.target.checked)
                                  }
                                  className="size-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-[11px]">Ẩn với sinh viên</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => removeTestCase(index)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                title="Xóa test case"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="block text-[11px] font-medium text-slate-500 mb-1">
                                Đầu vào (Input stdin):
                              </span>
                              <textarea
                                rows={2}
                                placeholder="Ví dụ: 5 10"
                                value={tc.input}
                                onChange={(e) =>
                                  updateTestCase(index, "input", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <span className="block text-[11px] font-medium text-slate-500 mb-1">
                                Đầu ra mong đợi (Expected stdout):
                              </span>
                              <textarea
                                rows={2}
                                placeholder="Ví dụ: 15"
                                value={tc.expectedOutput}
                                onChange={(e) =>
                                  updateTestCase(index, "expectedOutput", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Footer Form */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || loadingProblemDetail}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingProblemId ? "Lưu thay đổi" : "Tạo bài tập"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: XEM CHI TIẾT BÀI TẬP ===================== */}
      {previewProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewProblem.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                  <span>Thời gian: {previewProblem.timeLimitMs}ms</span>
                  <span>•</span>
                  <span>Bộ nhớ: {previewProblem.memoryLimitMb}MB</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewProblem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mô tả đề bài
                </h4>
                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewProblem.description || "Chưa có mô tả chi tiết."}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Danh sách Test cases ({previewProblem.testCases?.length || 0})
                </h4>
                <div className="space-y-2.5">
                  {previewProblem.testCases?.map((tc: any, i: number) => (
                    <div
                      key={tc.id || i}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800">Test case #{i + 1}</span>
                        {tc.isHidden ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <EyeOff size={11} /> Ẩn với sinh viên
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Eye size={11} /> Ví dụ công khai
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                          <span className="text-slate-400 block mb-1 text-[10px]">Input:</span>
                          <pre className="whitespace-pre-wrap">{tc.input || "(Trống)"}</pre>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                          <span className="text-slate-400 block mb-1 text-[10px]">Expected Output:</span>
                          <pre className="whitespace-pre-wrap">{tc.expectedOutput || "(Trống)"}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setPreviewProblem(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: XÁC NHẬN XÓA BÀI TẬP ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3.5">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bài tập?</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bạn có chắc chắn muốn xóa bài tập{" "}
              <strong className="text-slate-800">&quot;{deleteTarget.title}&quot;</strong>?
            </p>

            {(deleteTarget._count?.assignments || 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                ⚠️ Bài tập này hiện đang được giao ở <strong>{deleteTarget._count?.assignments} lớp học</strong>.
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
