"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Users,
  BookOpen,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  UserMinus,
  RefreshCw,
  X,
  Sparkles,
  CheckSquare,
  Square,
  Check,
  Calendar,
  Clock,
  FileCode2,
  BookmarkCheck,
} from "lucide-react";
import {
  getClassList,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentsToClass,
  removeStudentFromClass,
  removeStudentsFromClass,
  getAvailableStudents,
  assignProblemToClass,
  removeAssignmentFromClass,
  ClassroomItem,
  ClassroomDetailResponse,
  AvailableStudentItem,
} from "@/services/classroom.service";
import { getProblems, ProblemItem } from "@/services/problem.service";
import { toast } from "sonner";

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State: Tạo / Sửa lớp
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassroomItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);

  // Modal State: Quản lý chi tiết lớp & Phân công sinh viên
  const [detailModalClassId, setDetailModalClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<ClassroomDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form phân công sinh viên trong modal chi tiết
  const [assignMode, setAssignMode] = useState<"checkbox" | "manual">("checkbox");
  const [availableStudents, setAvailableStudents] = useState<AvailableStudentItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState("");
  const [inputStudentCodes, setInputStudentCodes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Tab điều hướng trong modal chi tiết: "students" (Sinh viên) hoặc "assignments" (Bài tập)
  const [activeDetailTab, setActiveDetailTab] = useState<"students" | "assignments">("students");

  // Form giao bài tập cho lớp
  const [allProblems, setAllProblems] = useState<ProblemItem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [problemSearchKeyword, setProblemSearchKeyword] = useState("");
  const [assignStartTime, setAssignStartTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [assignDeadline, setAssignDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [assigningProblem, setAssigningProblem] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);

  // State cho việc chọn nhiều sinh viên để xóa khỏi lớp
  const [selectedMemberIdsToRemove, setSelectedMemberIdsToRemove] = useState<string[]>([]);
  const [removingBatch, setRemovingBatch] = useState(false);

  // Modal State: Xóa lớp học
  const [deleteTargetClass, setDeleteTargetClass] = useState<ClassroomItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Tải danh sách lớp học
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const data = await getClassList();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách lớp học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  // 2. Mở Modal chi tiết lớp học để xem & phân công SV / Giao bài tập
  const fetchProblems = async (keyword = "") => {
    try {
      setLoadingProblems(true);
      const res = await getProblems({ search: keyword, limit: 100 });
      setAllProblems(res.items || (Array.isArray(res) ? res : []));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể tải danh sách bài tập.");
    } finally {
      setLoadingProblems(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setDetailModalClassId(id);
    setActiveDetailTab("students");
    setInputStudentCodes("");
    setSelectedStudentIds([]);
    setSelectedMemberIdsToRemove([]);
    setStudentSearchKeyword("");
    setAssignMode("checkbox");
    setSelectedProblemId("");
    setProblemSearchKeyword("");

    try {
      setLoadingDetail(true);
      setLoadingAvailable(true);

      const [detail, avail] = await Promise.all([
        getClassroomById(id),
        getAvailableStudents(id),
      ]);

      setClassDetail(detail);
      setAvailableStudents(Array.isArray(avail) ? avail : []);
      // Tải sẵn danh sách bài tập để chọn
      fetchProblems();
    } catch (err: any) {
      toast.error("Lỗi khi tải chi tiết lớp học.");
      setDetailModalClassId(null);
    } finally {
      setLoadingDetail(false);
      setLoadingAvailable(false);
    }
  };

  // Xử lý giao bài tập cho lớp
  const handleAssignProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailModalClassId) return;

    if (!selectedProblemId) {
      toast.error("Vui lòng chọn bài tập muốn giao cho lớp.");
      return;
    }

    try {
      setAssigningProblem(true);
      const res = await assignProblemToClass({
        classroomId: detailModalClassId,
        problemId: selectedProblemId,
        startTime: assignStartTime ? new Date(assignStartTime).toISOString() : undefined,
        deadline: assignDeadline ? new Date(assignDeadline).toISOString() : undefined,
      });

      toast.success(res.message || "Giao bài tập cho lớp thành công!");
      setSelectedProblemId("");

      // Cập nhật lại thông tin lớp học để hiển thị bài tập mới
      const updated = await getClassroomById(detailModalClassId);
      setClassDetail(updated);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể giao bài tập cho lớp.");
    } finally {
      setAssigningProblem(false);
    }
  };

  // Xử lý gỡ / xóa bài tập khỏi lớp
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!detailModalClassId) return;
    try {
      setRemovingAssignmentId(assignmentId);
      const res = await removeAssignmentFromClass(assignmentId);
      toast.success(res.message || "Đã gỡ bài tập khỏi lớp thành công!");

      // Cập nhật lại thông tin lớp học
      const updated = await getClassroomById(detailModalClassId);
      setClassDetail(updated);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể gỡ bài tập.");
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  // Tải lại danh sách sinh viên khả dụng khi tìm kiếm
  const handleSearchAvailable = async (kw: string) => {
    setStudentSearchKeyword(kw);
    if (!detailModalClassId) return;
    try {
      setLoadingAvailable(true);
      const avail = await getAvailableStudents(detailModalClassId, kw);
      setAvailableStudents(Array.isArray(avail) ? avail : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  // 3. Xử lý Tạo hoặc Sửa lớp học
  const handleOpenCreate = () => {
    setEditingClass(null);
    setFormCode("");
    setFormName("");
    setShowFormModal(true);
  };

  const handleOpenEdit = (c: ClassroomItem) => {
    setEditingClass(c);
    setFormCode(c.code);
    setFormName(c.name);
    setShowFormModal(true);
  };

  const handleSubmitClassForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      toast.error("Vui lòng điền đầy đủ mã lớp và tên môn học.");
      return;
    }

    try {
      setSubmittingForm(true);
      if (editingClass) {
        await updateClassroom(editingClass.id, {
          code: formCode.trim(),
          name: formName.trim(),
        });
        toast.success("Cập nhật lớp học thành công!");
      } else {
        await createClassroom({
          code: formCode.trim(),
          name: formName.trim(),
        });
        toast.success("Tạo lớp học mới thành công!");
      }
      setShowFormModal(false);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSubmittingForm(false);
    }
  };

  // 4. Xử lý Xóa lớp học
  const handleConfirmDelete = async () => {
    if (!deleteTargetClass) return;
    try {
      setDeleting(true);
      await deleteClassroom(deleteTargetClass.id);
      toast.success(`Đã xóa lớp "${deleteTargetClass.name}" thành công!`);
      setDeleteTargetClass(null);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa lớp học.");
    } finally {
      setDeleting(false);
    }
  };

  // 5. Xử lý Phân công sinh viên vào lớp (Checkbox hoặc Nhập mã)
  const handleAssignStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailModalClassId) return;

    if (assignMode === "checkbox") {
      if (selectedStudentIds.length === 0) {
        toast.error("Vui lòng tích chọn ít nhất một sinh viên để thêm.");
        return;
      }

      try {
        setAssigning(true);
        const res = await assignStudentsToClass(detailModalClassId, {
          studentIds: selectedStudentIds,
        });

        toast.success(res.message);
        setSelectedStudentIds([]);

        // Tải lại chi tiết lớp và danh sách sinh viên khả dụng
        const [updated, avail] = await Promise.all([
          getClassroomById(detailModalClassId),
          getAvailableStudents(detailModalClassId, studentSearchKeyword),
        ]);
        setClassDetail(updated);
        setAvailableStudents(Array.isArray(avail) ? avail : []);
        fetchClassrooms();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Không thể phân công sinh viên.");
      } finally {
        setAssigning(false);
      }
    } else {
      if (!inputStudentCodes.trim()) {
        toast.error("Vui lòng nhập ít nhất một mã sinh viên.");
        return;
      }

      const codes = inputStudentCodes
        .split(/[\n,; ]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (codes.length === 0) {
        toast.error("Danh sách mã sinh viên không hợp lệ.");
        return;
      }

      try {
        setAssigning(true);
        const res = await assignStudentsToClass(detailModalClassId, {
          studentCodes: codes,
        });

        toast.success(res.message);
        setInputStudentCodes("");

        // Tải lại chi tiết lớp và danh sách sinh viên khả dụng
        const [updated, avail] = await Promise.all([
          getClassroomById(detailModalClassId),
          getAvailableStudents(detailModalClassId, studentSearchKeyword),
        ]);
        setClassDetail(updated);
        setAvailableStudents(Array.isArray(avail) ? avail : []);
        fetchClassrooms();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Không thể phân công sinh viên.");
      } finally {
        setAssigning(false);
      }
    }
  };

  // Toggle chọn 1 sinh viên
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle chọn tất cả sinh viên trong danh sách khả dụng
  const toggleSelectAll = () => {
    if (selectedStudentIds.length === availableStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(availableStudents.map((s) => s.id));
    }
  };

  // 6. Xử lý Xóa sinh viên khỏi lớp (Xóa 1 bạn)
  const handleRemoveStudent = async (userId: string) => {
    if (!detailModalClassId) return;
    try {
      setRemovingUserId(userId);
      await removeStudentFromClass(detailModalClassId, userId);
      toast.success("Đã xóa sinh viên khỏi lớp!");
      setSelectedMemberIdsToRemove((prev) => prev.filter((id) => id !== userId));

      // Tải lại chi tiết lớp và danh sách sinh viên khả dụng
      const [updated, avail] = await Promise.all([
        getClassroomById(detailModalClassId),
        getAvailableStudents(detailModalClassId, studentSearchKeyword),
      ]);
      setClassDetail(updated);
      setAvailableStudents(Array.isArray(avail) ? avail : []);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa sinh viên khỏi lớp.");
    } finally {
      setRemovingUserId(null);
    }
  };

  // Toggle chọn sinh viên cần xóa
  const toggleSelectMemberToRemove = (userId: string) => {
    setSelectedMemberIdsToRemove((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Toggle chọn tất cả sinh viên trong lớp để xóa
  const toggleSelectAllMembersToRemove = () => {
    if (!classDetail?.members) return;
    if (selectedMemberIdsToRemove.length === classDetail.members.length) {
      setSelectedMemberIdsToRemove([]);
    } else {
      setSelectedMemberIdsToRemove(classDetail.members.map((m) => m.userId));
    }
  };

  // Xóa hàng loạt sinh viên đã chọn khỏi lớp
  const handleBatchRemoveStudents = async () => {
    if (!detailModalClassId || selectedMemberIdsToRemove.length === 0) return;
    try {
      setRemovingBatch(true);
      const res = await removeStudentsFromClass(
        detailModalClassId,
        selectedMemberIdsToRemove
      );
      toast.success(res.message);
      setSelectedMemberIdsToRemove([]);

      // Tải lại chi tiết lớp và danh sách khả dụng
      const [updated, avail] = await Promise.all([
        getClassroomById(detailModalClassId),
        getAvailableStudents(detailModalClassId, studentSearchKeyword),
      ]);
      setClassDetail(updated);
      setAvailableStudents(Array.isArray(avail) ? avail : []);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa các sinh viên đã chọn.");
    } finally {
      setRemovingBatch(false);
    }
  };

  // Lọc lớp học theo tìm kiếm
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classrooms, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Tiêu đề & Nút Thêm Lớp */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <GraduationCap size={14} className="text-blue-600" /> Quản lý Đào tạo
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Danh sách Lớp học
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo lớp mới, phân công sinh viên theo danh sách và quản lý các lớp học độc lập.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClassrooms}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Tạo lớp học mới</span>
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm & Thống kê tổng số lớp */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên môn học hoặc mã lớp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Hiển thị <span className="font-bold text-slate-900">{filteredClassrooms.length}</span> lớp học
        </p>
      </div>

      {/* Grid danh sách lớp học */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-400">Đang tải danh sách lớp học...</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white text-center p-6">
          <GraduationCap size={36} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Chưa có lớp học nào phù hợp</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Bạn có thể tạo lớp học mới bằng nút &quot;Tạo lớp học mới&quot; ở trên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClassrooms.map((c) => {
            const memberCount = c._count?.members || 0;
            const assignmentCount = c._count?.assignments || 0;

            return (
              <div
                key={c.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      {c.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Chỉnh sửa thông tin lớp"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTargetClass(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Xóa lớp học"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {c.name}
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Users size={15} className="text-slate-400" />
                      <span>
                        <strong className="text-slate-900 font-bold">{memberCount}</strong> sinh viên
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <BookOpen size={15} className="text-slate-400" />
                      <span>
                        <strong className="text-slate-900 font-bold">{assignmentCount}</strong> bài tập
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenDetail(c.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <Users size={14} />
                    <span>Xem & Phân công SV</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL 1: TẠO / CHỈNH SỬA LỚP ===================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-600" />
                {editingClass ? "Chỉnh sửa Lớp học" : "Tạo Lớp học Mới"}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitClassForm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã lớp học (Ví dụ: 64CNTT_VA, CS101) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập mã lớp..."
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-slate-900 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên môn học / Tên lớp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cấu trúc dữ liệu và Giải thuật"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {submittingForm && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingClass ? "Lưu thay đổi" : "Tạo lớp"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: CHI TIẾT LỚP & PHÂN CÔNG SINH VIÊN ===================== */}
      {detailModalClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {classDetail?.code || "..."}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    {classDetail?.name || "Đang tải..."}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Quản lý danh sách sinh viên trực thuộc và phân công sinh viên mới vào lớp.
                </p>
              </div>
              <button
                onClick={() => setDetailModalClassId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs Điều Hướng: Sinh viên & Bài tập */}
            <div className="flex items-center border-b border-slate-100 px-5 pt-1 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveDetailTab("students")}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all cursor-pointer ${
                  activeDetailTab === "students"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users size={15} />
                <span>Danh sách Sinh viên</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeDetailTab === "students"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {classDetail?.members?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("assignments")}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all cursor-pointer ${
                  activeDetailTab === "assignments"
                    ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen size={15} />
                <span>Bài tập đã giao</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeDetailTab === "assignments"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {classDetail?.assignments?.length || 0}
                </span>
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {activeDetailTab === "students" ? (
                <>
                  {/* Khu vực Phân công sinh viên (Tích chọn danh sách hoặc Nhập mã) */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <UserPlus size={15} /> Thêm sinh viên vào lớp
                      </h3>

                      {/* Switch chế độ: Danh sách tích chọn vs Nhập mã */}
                      <div className="flex items-center rounded-lg bg-blue-100/60 p-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setAssignMode("checkbox")}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            assignMode === "checkbox"
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Chọn từ danh sách ({availableStudents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignMode("manual")}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            assignMode === "manual"
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Nhập mã thủ công
                        </button>
                      </div>
                    </div>

                    {assignMode === "checkbox" ? (
                      <form onSubmit={handleAssignStudents} className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {/* Ô tìm kiếm sinh viên chưa có lớp */}
                          <div className="relative flex-1">
                            <Search
                              size={13}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              placeholder="Tìm theo tên, MSSV, email..."
                              value={studentSearchKeyword}
                              onChange={(e) => handleSearchAvailable(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Nút chọn tất cả */}
                          {availableStudents.length > 0 && (
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded bg-blue-100/50 hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {selectedStudentIds.length === availableStudents.length &&
                              availableStudents.length > 0 ? (
                                <>
                                  <CheckSquare size={13} /> Bỏ chọn hết
                                </>
                              ) : (
                                <>
                                  <Square size={13} /> Chọn tất cả ({availableStudents.length})
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Danh sách sinh viên có sẵn để tích chọn */}
                        <div className="rounded-lg border border-slate-200 bg-white max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {loadingAvailable ? (
                            <div className="flex items-center justify-center p-6 text-xs text-slate-400">
                              <Loader2 size={15} className="animate-spin mr-2 text-blue-600" />
                              Đang tải danh sách sinh viên...
                            </div>
                          ) : availableStudents.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                              {studentSearchKeyword
                                ? "Không tìm thấy sinh viên phù hợp."
                                : "Tất cả sinh viên đã được phân công vào lớp!"}
                            </div>
                          ) : (
                            availableStudents.map((stu) => {
                              const isChecked = selectedStudentIds.includes(stu.id);
                              return (
                                <div
                                  key={stu.id}
                                  onClick={() => toggleSelectStudent(stu.id)}
                                  className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50/50 cursor-pointer transition-colors ${
                                    isChecked ? "bg-blue-50/70" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-800 truncate">
                                        {stu.fullName}
                                      </p>
                                      <p className="text-[11px] text-slate-400 font-mono truncate">
                                        MSSV: {stu.studentCode || "Chưa có"} • {stu.email}
                                      </p>
                                    </div>
                                  </div>
                                  {isChecked && (
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded">
                                      Đã chọn
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Nút Submit thêm theo checkbox */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-slate-500">
                            Đã chọn:{" "}
                            <strong className="text-blue-600">{selectedStudentIds.length}</strong> sinh viên
                          </span>
                          <button
                            type="submit"
                            disabled={assigning || selectedStudentIds.length === 0}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {assigning && <Loader2 size={13} className="animate-spin" />}
                            <span>Thêm {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""} vào lớp</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleAssignStudents} className="space-y-3">
                        <div>
                          <textarea
                            rows={3}
                            placeholder="Nhập danh sách mã sinh viên, phân tách bằng dấu phẩy hoặc xuống dòng (Ví dụ: SV001, SV002, SV003)..."
                            value={inputStudentCodes}
                            onChange={(e) => setInputStudentCodes(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={assigning || !inputStudentCodes.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {assigning && <Loader2 size={13} className="animate-spin" />}
                            <span>Thêm sinh viên</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Danh sách sinh viên hiện tại trong lớp */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Users size={14} /> Sinh viên trong lớp ({classDetail?.members?.length || 0})
                      </h3>

                      {classDetail?.members && classDetail.members.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={toggleSelectAllMembersToRemove}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {selectedMemberIdsToRemove.length === classDetail.members.length ? (
                              <>
                                <CheckSquare size={13} className="text-rose-600" /> Bỏ chọn hết
                              </>
                            ) : (
                              <>
                                <Square size={13} /> Chọn tất cả
                              </>
                            )}
                          </button>

                          {selectedMemberIdsToRemove.length > 0 && (
                            <button
                              type="button"
                              onClick={handleBatchRemoveStudents}
                              disabled={removingBatch}
                              className="flex items-center gap-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {removingBatch ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              <span>Xóa ({selectedMemberIdsToRemove.length})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {loadingDetail ? (
                      <div className="flex items-center justify-center p-8 text-xs text-slate-400">
                        <Loader2 size={16} className="animate-spin mr-2 text-blue-600" />
                        Đang tải danh sách thành viên...
                      </div>
                    ) : !classDetail?.members || classDetail.members.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        Lớp học này hiện chưa có sinh viên nào.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                        {classDetail.members.map((m) => {
                          const isSelectedToRemove = selectedMemberIdsToRemove.includes(m.userId);
                          return (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors ${
                                isSelectedToRemove ? "bg-rose-50/40" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                <input
                                  type="checkbox"
                                  checked={isSelectedToRemove}
                                  onChange={() => toggleSelectMemberToRemove(m.userId)}
                                  className="size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {m.user.fullName}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                    MSSV: {m.user.studentCode || "Chưa có"} • {m.user.email}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStudent(m.userId)}
                                disabled={removingUserId === m.userId}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                title="Xóa khỏi lớp"
                              >
                                {removingUserId === m.userId ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <UserMinus size={12} />
                                )}
                                <span>Xóa</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ================= TAB 2: BÀI TẬP ĐÃ GIAO ================= */
                <>
                  {/* Form Phân công bài tập mới cho lớp */}
                  <form
                    onSubmit={handleAssignProblem}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3.5"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <FileCode2 size={15} /> Giao bài tập cho lớp học
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Chọn bài tập từ Ngân hàng đề <span className="text-rose-500">*</span>
                        </label>
                        {loadingProblems ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                            <Loader2 size={14} className="animate-spin text-indigo-600" />
                            Đang tải ngân hàng đề bài...
                          </div>
                        ) : (
                          <select
                            value={selectedProblemId}
                            onChange={(e) => setSelectedProblemId(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">-- Chọn bài tập cần giao --</option>
                            {allProblems.map((prob) => {
                              const alreadyAssigned = classDetail?.assignments?.some(
                                (a) => a.problem.id === prob.id
                              );
                              return (
                                <option
                                  key={prob.id}
                                  value={prob.id}
                                  disabled={alreadyAssigned}
                                >
                                  {prob.title} - {prob.timeLimitMs}ms / {prob.memoryLimitMb}MB
                                  {alreadyAssigned ? " (Đã giao)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>

                      {/* Thời gian bắt đầu và Deadline */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" /> Thời gian mở bài
                          </label>
                          <input
                            type="datetime-local"
                            value={assignStartTime}
                            onChange={(e) => setAssignStartTime(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" /> Hạn chót nộp bài (Deadline)
                          </label>
                          <input
                            type="datetime-local"
                            value={assignDeadline}
                            onChange={(e) => setAssignDeadline(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={assigningProblem || !selectedProblemId}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {assigningProblem && <Loader2 size={13} className="animate-spin" />}
                        <span>Giao bài tập này</span>
                      </button>
                    </div>
                  </form>

                  {/* Danh sách bài tập đã giao */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <BookmarkCheck size={14} /> Danh sách bài tập đang giao ({classDetail?.assignments?.length || 0})
                    </h3>

                    {loadingDetail ? (
                      <div className="flex items-center justify-center p-8 text-xs text-slate-400">
                        <Loader2 size={16} className="animate-spin mr-2 text-indigo-600" />
                        Đang tải danh sách bài tập...
                      </div>
                    ) : !classDetail?.assignments || classDetail.assignments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        Lớp học này chưa được giao bài tập nào. Hãy chọn một bài từ ngân hàng đề ở trên để giao!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                        {classDetail.assignments.map((item) => {
                          const isRemoving = removingAssignmentId === item.id;
                          const hasPassed = item.deadline && new Date(item.deadline) < new Date();

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3.5 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {item.problem.title}
                                  </h4>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400" />
                                    Bắt đầu: {item.startTime ? new Date(item.startTime).toLocaleString("vi-VN") : "Ngay bây giờ"}
                                  </span>
                                  <span
                                    className={`flex items-center gap-1 ${
                                      hasPassed ? "text-rose-600 font-semibold" : ""
                                    }`}
                                  >
                                    Hạn nộp: {item.deadline ? new Date(item.deadline).toLocaleString("vi-VN") : "Vô thời hạn"}
                                    {hasPassed && " (Đã hết hạn)"}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveAssignment(item.id)}
                                disabled={isRemoving}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                title="Gỡ bài tập khỏi lớp"
                              >
                                {isRemoving ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                <span>Gỡ bài</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setDetailModalClassId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: XÁC NHẬN XÓA LỚP ===================== */}
      {deleteTargetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3.5">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa lớp học?</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bạn có chắc chắn muốn xóa lớp{" "}
              <strong className="text-slate-800">&quot;{deleteTargetClass.name}&quot;</strong> (Mã: {deleteTargetClass.code})?
            </p>

            {(deleteTargetClass._count?.members || 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                ⚠️ Lớp này hiện có <strong>{deleteTargetClass._count?.members} sinh viên</strong>. Hệ thống sẽ từ chối xóa để bảo vệ dữ liệu học tập!
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetClass(null)}
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
