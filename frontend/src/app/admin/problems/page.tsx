"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Sparkles,
  Cpu,
  Check,
  AlertTriangle,
  Upload,
  FileText,
} from "lucide-react";
import {
  getProblems,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem,
  generateBoundaryTests,
  ProblemItem,
  TestCaseItem,
  GenerateBoundaryTestsResponse,
} from "@/services/problem.service";
import { toast } from "sonner";

interface FormTestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

import { useAdminStore } from "@/store/useAdminStore";

export default function AdminProblemsPage() {
  const {
    problems,
    totalProblems,
    totalPages,
    currentPage,
    pageSize,
    searchQuery,
    loadingProblems,
    fetchProblems,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
  } = useAdminStore();

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

  // Modal Tự động sinh Test Case Biên (AST + AI)
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);
  const [boundarySolutionCode, setBoundarySolutionCode] = useState("");
  const [boundaryFileName, setBoundaryFileName] = useState("");
  const [boundaryLanguage, setBoundaryLanguage] = useState("python");
  const [boundaryNumCases, setBoundaryNumCases] = useState(5);
  const [generatingBoundary, setGeneratingBoundary] = useState(false);
  const [boundaryResult, setBoundaryResult] = useState<GenerateBoundaryTestsResponse | null>(null);
  const [boundaryStep, setBoundaryStep] = useState<"input" | "generating" | "result">("input");
  const boundaryFileInputRef = useRef<HTMLInputElement>(null);

  // Ref & scroll mượt lên đầu trang khi chuyển trang
  const isFirstRender = useRef(true);
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  // Loading state khi chuyển trang hoặc tìm kiếm
  const [isTableLoading, setIsTableLoading] = useState(false);

  // 1. Tải danh sách bài tập từ Backend kèm phân trang qua store
  const fetchProblemsList = async (page = currentPage, limit = pageSize, search = searchQuery, force = false) => {
    const cacheKey = `${search.trim()}_${page}_${limit}`;
    const isCached = !force && !!useAdminStore.getState().problemsPageCache[cacheKey];

    if (!isCached) {
      setIsTableLoading(true);
    }
    try {
      await fetchProblems({ page, limit, search, force });
    } finally {
      setIsTableLoading(false);
    }
  };

  // Cuộn lên đầu trang khi chuyển trang
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [currentPage]);

  useEffect(() => {
    const cacheKey = `${searchQuery.trim()}_${currentPage}_${pageSize}`;
    const isCached = !!useAdminStore.getState().problemsPageCache[cacheKey];

    // Chỉ bật loading khi trang này CHƯA có trong cache Zustand
    if (!isCached) {
      setIsTableLoading(true);
    }

    fetchProblems({ page: currentPage, limit: pageSize, search: searchQuery, force: false })
      .finally(() => {
        setIsTableLoading(false);
      });
  }, [currentPage, pageSize]);

  // Khi tìm kiếm thay đổi, reset về trang 1 và tải
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTableLoading(true);
      fetchProblems({ page: 1, limit: pageSize, search: searchQuery, force: true })
        .finally(() => {
          setTimeout(() => setIsTableLoading(false), 200);
        });
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
            id: tc.id,
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

  // Xử lý chọn file code mẫu giải thuật
  const handleBoundaryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Tự động nhận diện ngôn ngữ dựa trên đuôi file
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "py") {
      setBoundaryLanguage("python");
    } else if (ext === "cpp" || ext === "cc" || ext === "cxx" || ext === "c") {
      setBoundaryLanguage("cpp");
    } else if (ext === "java") {
      setBoundaryLanguage("java");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBoundarySolutionCode(content);
        setBoundaryFileName(file.name);
        toast.success(`Đã tải lên tệp: ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error("Không thể đọc tệp mã nguồn này.");
    };
    reader.readAsText(file);
  };

  // 4b. Xử lý tự động sinh Test Case Biên (AST + AI + Judge0)
  const handleGenerateBoundary = async () => {
    if (!formTitle.trim()) {
      toast.error("Vui lòng nhập Tiêu đề bài tập trước khi sinh test case.");
      return;
    }
    if (!formDescription.trim()) {
      toast.error("Vui lòng nhập Mô tả bài tập trước khi sinh test case.");
      return;
    }
    if (!boundarySolutionCode.trim()) {
      toast.error("Vui lòng chọn file mã nguồn giải mẫu (Reference Solution).");
      return;
    }

    try {
      setGeneratingBoundary(true);
      setBoundaryStep("generating");
      setBoundaryResult(null);

      const res = await generateBoundaryTests({
        problemTitle: formTitle.trim(),
        problemDescription: formDescription.trim(),
        solutionCode: boundarySolutionCode.trim(),
        language: boundaryLanguage,
        numCases: Number(boundaryNumCases) || 5,
      });

      setBoundaryResult(res);
      setBoundaryStep("result");
      toast.success(res.summary || "Đã sinh test case biên thành công!");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Lỗi khi sinh test case biên.";
      toast.error(errMsg);
      setBoundaryStep("input");
    } finally {
      setGeneratingBoundary(false);
    }
  };

  const handleApplyBoundaryTests = (mode: "replace" | "append") => {
    if (!boundaryResult || !boundaryResult.testCases || boundaryResult.testCases.length === 0) {
      toast.error("Không có test case nào để áp dụng.");
      return;
    }

    const newCases: FormTestCase[] = boundaryResult.testCases.map((tc) => ({
      input: tc.input || "",
      expectedOutput: tc.expectedOutput || "",
      isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
    }));

    if (mode === "replace") {
      setFormTestCases(newCases);
      toast.success(`Đã thay thế bằng ${newCases.length} test case biên mới!`);
    } else {
      const existing = formTestCases.filter(
        (tc) => tc.input.trim() !== "" || tc.expectedOutput.trim() !== ""
      );
      setFormTestCases([...existing, ...newCases]);
      toast.success(`Đã thêm ${newCases.length} test case biên vào danh sách!`);
    }

    setShowBoundaryModal(false);
    setBoundaryStep("input");
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
          id: tc.id,
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
      fetchProblemsList(currentPage, pageSize, searchQuery, true);
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
      fetchProblemsList(currentPage, pageSize, searchQuery, true);
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
            onClick={() => fetchProblemsList(currentPage, pageSize, searchQuery, true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loadingProblems ? "animate-spin text-indigo-600" : ""} />
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
      {loadingProblems && problems.length === 0 ? (
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
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {/* Thanh loading tiến trình chạy trên đầu bảng khi chuyển trang hoặc tìm kiếm */}
          {isTableLoading && (
            <div className="absolute top-0 left-0 right-0 z-20 h-1 overflow-hidden bg-indigo-100">
              <div className="h-full w-full animate-pulse bg-indigo-600"></div>
            </div>
          )}

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
              <tbody
                className={`divide-y divide-slate-100 transition-opacity duration-200 ${
                  isTableLoading ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
              >
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
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
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
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
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
                          Điểm số bài nộp được tính đều theo số lượng test case (Ví dụ: bài có {formTestCases.length} test thì mỗi test đúng chiếm 1/{formTestCases.length} trọng số, quy đổi về thang điểm 10.0).
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBoundaryStep("input");
                            setBoundaryResult(null);
                            setShowBoundaryModal(true);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 transition-all cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>⚡ Sinh Test Biên (AST + AI)</span>
                        </button>

                        <button
                          type="button"
                          onClick={addTestCase}
                          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Thêm Test Case</span>
                        </button>
                      </div>
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

            {(deleteTarget._count?.submissions || 0) > 0 ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800 leading-relaxed">
                🚫 <strong>Không thể xóa:</strong> Bài tập này đã có <strong>{deleteTarget._count?.submissions} bài nộp</strong> từ sinh viên. Để bảo vệ dữ liệu và lịch sử chấm điểm, hệ thống không cho phép xóa bài tập đã có bài nộp.
              </div>
            ) : (deleteTarget._count?.assignments || 0) > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                ⚠️ Bài tập này hiện đang được giao ở <strong>{deleteTarget._count?.assignments} lớp học</strong>.
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting || (deleteTarget._count?.submissions || 0) > 0}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 4: TỰ ĐỘNG SINH TEST CASE BIÊN (AST + AI + JUDGE0) ===================== */}
      {showBoundaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-200">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Tự động sinh Test Case Biên
                    </h2>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 tracking-wide">
                      AST + GEMINI + JUDGE0
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tải lên file code mẫu (.py, .cpp, .java) để hệ thống trích xuất AST và dùng AI sinh bộ test case biên chuẩn xác.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBoundaryModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Bước 1: Nhập thông số */}
              {boundaryStep === "input" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-indigo-900 leading-relaxed">
                    <p className="font-semibold flex items-center gap-1.5 text-indigo-800">
                      <Cpu size={14} /> Quy trình hoạt động:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-[11px] text-indigo-700">
                      <li><strong>Phân tích AST:</strong> Quét cây cú pháp của Code mẫu để tìm các phép so sánh (<code>&lt;</code>, <code>&lt;=</code>, <code>==</code>, <code>len()</code>), mốc 0, 1, tràn số.</li>
                      <li><strong>Làm giàu ngữ cảnh (AI):</strong> Gemini đọc đề bài + điều kiện AST để sinh chuỗi Input (stdin) tương ứng.</li>
                      <li><strong>Thực thi Oracle:</strong> Chạy code mẫu trên Judge0 để tính <code>expectedOutput</code> chuẩn xác tuyệt đối.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ngôn ngữ của Code mẫu
                      </label>
                      <select
                        value={boundaryLanguage}
                        onChange={(e) => setBoundaryLanguage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="python">Python 3 (ast.parse)</option>
                        <option value="cpp">C++ (Pattern Extractor)</option>
                        <option value="java">Java (Pattern Extractor)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Số lượng Test Case Biên mong muốn
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={boundaryNumCases}
                        onChange={(e) => setBoundaryNumCases(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Chọn tệp mã nguồn giải mẫu (Reference Solution) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Hỗ trợ .py, .cpp, .java
                      </span>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={boundaryFileInputRef}
                      type="file"
                      accept=".py,.cpp,.cc,.cxx,.c,.java"
                      onChange={handleBoundaryFileUpload}
                      className="hidden"
                    />

                    {/* Khung chọn file */}
                    {!boundarySolutionCode ? (
                      <div
                        onClick={() => boundaryFileInputRef.current?.click()}
                        className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-8 text-center transition-all hover:border-indigo-500 hover:bg-indigo-50/70 cursor-pointer"
                      >
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-indigo-100 text-indigo-600 transition-transform group-hover:scale-110">
                          <Upload size={22} />
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-700">
                          Nhấp để chọn tệp mã nguồn từ máy tính
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Chấp nhận file <code>.py</code> (Python), <code>.cpp</code> (C++), hoặc <code>.java</code> (Java)
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                        {/* Thanh tiêu đề tệp đã chọn */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-2">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <FileText size={15} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-xs truncate max-w-[280px] sm:max-w-md">
                                {boundaryFileName || "Tệp mã nguồn giải mẫu"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {boundarySolutionCode.split("\n").length} dòng • {new Blob([boundarySolutionCode]).size} bytes
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => boundaryFileInputRef.current?.click()}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              Đổi tệp khác
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBoundarySolutionCode("");
                                setBoundaryFileName("");
                                if (boundaryFileInputRef.current) {
                                  boundaryFileInputRef.current.value = "";
                                }
                              }}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Gỡ tệp"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Xem trước nội dung mã nguồn trong tệp */}
                        <div className="p-3 bg-slate-950 max-h-56 overflow-y-auto">
                          <pre className="font-mono text-[11px] leading-relaxed text-emerald-400 whitespace-pre-wrap selection:bg-emerald-900">
                            {boundarySolutionCode}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bước 2: Đang phân tích & thực thi */}
              {boundaryStep === "generating" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="relative">
                    <div className="size-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                      <Sparkles size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Đang tự động sinh Test Case Biên...</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Hệ thống đang duyệt cây AST mã nguồn, đưa tri thức biên vào Gemini và chạy thử trên Judge0 Sandbox.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-purple-700 font-medium bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                    <span className="animate-pulse">🌲 AST Analysis</span>
                    <span>→</span>
                    <span className="animate-pulse">🤖 Gemini Prompting</span>
                    <span>→</span>
                    <span className="animate-pulse">⚙️ Judge0 Execution</span>
                  </div>
                </div>
              )}

              {/* Bước 3: Xem kết quả */}
              {boundaryStep === "result" && boundaryResult && (
                <div className="space-y-4">
                  {/* Báo cáo AST */}
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Cpu size={14} /> Tri thức trích xuất từ cây AST:
                      </span>
                      <span className="rounded-md bg-purple-200/60 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                        {boundaryResult.astReport?.conditions?.length || 0} điều kiện rẽ nhánh
                      </span>
                    </div>

                    {boundaryResult.astReport?.conditions && boundaryResult.astReport.conditions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {boundaryResult.astReport.conditions.map((cond, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-2 py-1 text-[11px] font-mono text-purple-800 shadow-2xs"
                            title={`Dòng ${cond.line} - Loại: ${cond.category}`}
                          >
                            <span className="text-slate-400 text-[10px]">L{cond.line}:</span>
                            <strong>{cond.expression}</strong>
                            {cond.bva_candidates && cond.bva_candidates.length > 0 && (
                              <span className="text-[10px] text-indigo-600">
                                [BVA: {cond.bva_candidates.slice(0, 3).join(", ")}]
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-purple-700 italic">
                        Mã nguồn đơn giản hoặc không phát hiện lệnh rẽ nhánh if/while rõ ràng. Đã dùng các mốc biên kinh điển (0, 1, -1).
                      </p>
                    )}
                  </div>

                  {/* Danh sách Test Cases */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Danh sách Test Case Biên ({boundaryResult.testCases?.length || 0})
                      </h4>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={13} /> 100% Output xác thực qua Judge0
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {boundaryResult.testCases?.map((tc, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 text-[10px]">
                                Test #{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {tc.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {tc.category || "boundary"}
                            </span>
                          </div>

                          {tc.description && (
                            <p className="text-[11px] text-slate-500 italic">
                              💡 {tc.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="rounded-lg bg-white border border-slate-200 p-2 font-mono">
                              <span className="text-[10px] text-slate-400 block mb-0.5">Input (stdin):</span>
                              <pre className="whitespace-pre-wrap text-slate-800 text-[11px] max-h-16 overflow-y-auto">
                                {tc.input}
                              </pre>
                            </div>
                            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-2 font-mono">
                              <span className="text-[10px] text-emerald-700 block mb-0.5">Expected Output (Judge0):</span>
                              <pre className="whitespace-pre-wrap text-emerald-900 text-[11px] font-bold max-h-16 overflow-y-auto">
                                {tc.expectedOutput || "(Trống)"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl">
              {boundaryStep === "input" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowBoundaryModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateBoundary}
                    disabled={generatingBoundary}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Phân tích AST & Sinh Test</span>
                  </button>
                </>
              )}

              {boundaryStep === "generating" && (
                <div className="w-full text-center text-xs text-slate-400">
                  Vui lòng đợi vài giây để hệ thống phân tích và chạy qua Judge0...
                </div>
              )}

              {boundaryStep === "result" && (
                <>
                  <button
                    type="button"
                    onClick={() => setBoundaryStep("input")}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    ← Chạy lại
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyBoundaryTests("append")}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                    >
                      + Thêm vào danh sách hiện tại
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBoundaryTests("replace")}
                      className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 cursor-pointer"
                    >
                      ✓ Thay thế toàn bộ test cases
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
