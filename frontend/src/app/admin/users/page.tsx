"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  GraduationCap,
  Mail,
  Key,
  School,
  IdCard,
  Filter,
} from "lucide-react";
import {
  createUser,
  updateUser,
  deleteUser,
  UserItem,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/services/user.service";
import { getClassList, ClassroomItem } from "@/services/classroom.service";
import { useAdminStore } from "@/store/useAdminStore";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const {
    users,
    totalUsers,
    totalUserPages,
    currentUserPage,
    userPageSize,
    userSearchQuery,
    userRoleFilter,
    userClassroomIdFilter,
    loadingUsers,
    fetchUsers,
    setCurrentUserPage,
    setUserPageSize,
    setUserSearchQuery,
    setUserRoleFilter,
    setUserClassroomIdFilter,
  } = useAdminStore();

  // Danh sách lớp học để lọc và gán khi tạo/sửa
  const [classList, setClassList] = useState<ClassroomItem[]>([]);

  // Modal State: Thêm / Sửa người dùng
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formStudentCode, setFormStudentCode] = useState("");
  const [formRole, setFormRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [formClassroomId, setFormClassroomId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal State: Xóa người dùng
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Loading state khi đổi trang, đổi lớp học hoặc đổi filter
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Ref & scroll mượt lên đầu trang khi chuyển trang
  const isFirstRender = useRef(true);
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  // 1. Tải danh sách lớp học để phục vụ chọn lớp
  useEffect(() => {
    getClassList()
      .then((data) => setClassList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi lấy danh sách lớp học:", err));
  }, []);

  // Cuộn lên đầu trang khi chuyển trang
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [currentUserPage]);

  // 2. Tải danh sách người dùng khi các param thay đổi (SWR pattern)
  useEffect(() => {
    const cacheKey = `${userSearchQuery.trim()}_${userRoleFilter}_${userClassroomIdFilter}_${currentUserPage}_${userPageSize}`;
    const isCached = !!useAdminStore.getState().usersPageCache[cacheKey];

    // Chỉ bật loading khi trang này CHƯA có trong cache Zustand
    if (!isCached) {
      setIsTableLoading(true);
    }

    fetchUsers({
      page: currentUserPage,
      limit: userPageSize,
      search: userSearchQuery,
      role: userRoleFilter,
      classroomId: userClassroomIdFilter,
      force: false,
    }).finally(() => {
      setIsTableLoading(false);
    });
  }, [currentUserPage, userPageSize, userRoleFilter, userClassroomIdFilter]);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers({
        page: 1,
        limit: userPageSize,
        search: userSearchQuery,
        role: userRoleFilter,
        classroomId: userClassroomIdFilter,
        force: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormPassword("");
    setFormFullName("");
    setFormStudentCode("");
    setFormRole("STUDENT");
    setFormClassroomId("");
    setShowFormModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormPassword("");
    setFormFullName(u.fullName);
    setFormStudentCode(u.studentCode || "");
    setFormRole(u.role);
    setFormClassroomId(u.classrooms?.[0]?.classroomId || "");
    setShowFormModal(true);
  };

  // Xử lý submit form tạo/sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formFullName.trim()) {
      toast.error("Vui lòng điền đầy đủ Email và Họ tên.");
      return;
    }

    if (!editingUser && (!formPassword || formPassword.length < 6)) {
      toast.error("Mật khẩu tài khoản mới phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setSubmitting(true);

      if (editingUser) {
        const payload: UpdateUserPayload = {
          email: formEmail.trim(),
          fullName: formFullName.trim(),
          studentCode: formStudentCode.trim() || undefined,
          role: formRole,
          classroomId: formClassroomId || undefined,
        };

        const res = await updateUser(editingUser.id, payload);
        toast.success(res.message || "Cập nhật tài khoản thành công!");
      } else {
        const payload: CreateUserPayload = {
          email: formEmail.trim(),
          password: formPassword,
          fullName: formFullName.trim(),
          studentCode: formStudentCode.trim() || undefined,
          role: formRole,
          classroomId: formClassroomId || undefined,
        };

        const res = await createUser(payload);
        toast.success(res.message || "Tạo tài khoản thành công!");
      }

      setShowFormModal(false);
      fetchUsers({ force: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý xác nhận xóa tài khoản
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await deleteUser(deleteTarget.id);
      toast.success(res.message || "Đã xóa tài khoản thành công!");
      setDeleteTarget(null);
      fetchUsers({ force: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể xóa tài khoản này.");
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
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
              <Users size={14} className="text-purple-600" /> Quản trị Người dùng
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Quản lý Tài khoản
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem danh sách sinh viên, quản trị viên, phân quyền và liên kết lớp học.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUsers({ force: true })}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loadingUsers ? "animate-spin text-purple-600" : ""} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc & Tìm kiếm */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Tìm kiếm tên / email / mã SV */}
        <div className="relative sm:col-span-6 lg:col-span-5">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, mã sinh viên..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
          />
        </div>

        {/* Lọc theo Role */}
        <div className="sm:col-span-3 lg:col-span-3">
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 cursor-pointer"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="STUDENT">Chỉ Sinh viên (STUDENT)</option>
            <option value="ADMIN">Chỉ Quản trị viên (ADMIN)</option>
          </select>
        </div>

        {/* Lọc theo Lớp học */}
        <div className="sm:col-span-3 lg:col-span-4">
          <select
            value={userClassroomIdFilter}
            onChange={(e) => setUserClassroomIdFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 cursor-pointer"
          >
            <option value="">Tất cả lớp học</option>
            {classList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách người dùng */}
      {loadingUsers && users.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-8 animate-spin text-purple-600" />
          <p className="text-xs font-medium text-slate-400">Đang nạp danh sách tài khoản...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Không tìm thấy tài khoản nào</h3>
          <p className="max-w-sm text-xs text-slate-400">
            Không có người dùng phù hợp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Thanh loading tiến trình chạy trên đầu bảng khi đổi trang hoặc đổi bộ lọc */}
          {isTableLoading && (
            <div className="absolute top-0 left-0 right-0 z-20 h-1 overflow-hidden bg-purple-100">
              <div className="h-full w-full animate-pulse bg-purple-600"></div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-5">Họ và tên / Email</th>
                  <th className="py-3.5 px-3">Mã sinh viên</th>
                  <th className="py-3.5 px-3">Vai trò</th>
                  <th className="py-3.5 px-3">Lớp học tham gia</th>
                  <th className="py-3.5 px-3 text-center">Bài nộp</th>
                  <th className="py-3.5 px-3">Ngày tạo</th>
                  <th className="py-3.5 pr-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 text-slate-600 transition-opacity duration-200 ${
                  isTableLoading ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
              >
                {users.map((u) => {
                  const isAdmin = u.role === "ADMIN";
                  const primaryClass = u.classrooms?.[0]?.classroom;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Họ tên & Email */}
                      <td className="py-3.5 pl-5">
                        <div className="font-semibold text-slate-900 text-sm">
                          {u.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail size={11} /> {u.email}
                        </div>
                      </td>

                      {/* Mã SV */}
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                        {u.studentCode ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                            <IdCard size={11} className="text-slate-500" />
                            {u.studentCode}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-3">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                            <Shield size={11} /> ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            <GraduationCap size={12} /> STUDENT
                          </span>
                        )}
                      </td>

                      {/* Lớp học */}
                      <td className="py-3.5 px-3">
                        {primaryClass ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-700 font-medium">
                            <School size={11} className="text-slate-400" />
                            {primaryClass.code}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Chưa phân lớp</span>
                        )}
                      </td>

                      {/* Số bài nộp */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {u._count?.submissions ?? 0}
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>

                      {/* Nút hành động */}
                      <td className="py-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors cursor-pointer"
                            title="Chỉnh sửa tài khoản"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Hiển thị</span>
              <select
                value={userPageSize}
                onChange={(e) => {
                  setUserPageSize(Number(e.target.value));
                  setCurrentUserPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value={5}>5 tài khoản / trang</option>
                <option value={10}>10 tài khoản / trang</option>
                <option value={20}>20 tài khoản / trang</option>
                <option value={50}>50 tài khoản / trang</option>
              </select>
              <span>
                (từ{" "}
                <strong className="text-slate-800">
                  {totalUsers === 0 ? 0 : (currentUserPage - 1) * userPageSize + 1}
                </strong>{" "}
                -{" "}
                <strong className="text-slate-800">
                  {Math.min(currentUserPage * userPageSize, totalUsers)}
                </strong>{" "}
                trong tổng số <strong className="text-slate-800">{totalUsers}</strong> người dùng)
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentUserPage(Math.max(currentUserPage - 1, 1))}
                disabled={currentUserPage <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalUserPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      totalUserPages <= 7 ||
                      page === 1 ||
                      page === totalUserPages ||
                      Math.abs(page - currentUserPage) <= 1
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
                          onClick={() => setCurrentUserPage(page)}
                          className={`size-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            currentUserPage === page
                              ? "bg-purple-600 text-white shadow-xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentUserPage(Math.min(currentUserPage + 1, totalUserPages))}
                disabled={currentUserPage >= totalUserPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: THÊM / SỬA TÀI KHOẢN ===================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUser ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingUser
                      ? "Cập nhật thông tin tài khoản người dùng"
                      : "Thêm tài khoản sinh viên hoặc quản trị viên vào hệ thống"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Họ tên */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ví dụ: student@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>

              {/* Mật khẩu (chỉ hiển thị khi tạo mới tài khoản) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>
              )}

              {/* Grid 2 cột: Mã sinh viên & Vai trò */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã sinh viên (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: SV2024001"
                    value={formStudentCode}
                    onChange={(e) => setFormStudentCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                  >
                    <option value="STUDENT">Sinh viên (STUDENT)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
              </div>

              {/* Phân vào lớp học */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp học gán kèm
                </label>
                <select
                  value={formClassroomId}
                  onChange={(e) => setFormClassroomId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all cursor-pointer"
                >
                  <option value="">Không gán lớp ban đầu</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: XÁC NHẬN XÓA TÀI KHOẢN ===================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <AlertCircle size={26} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Xác nhận xóa tài khoản?
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản{" "}
              <strong className="text-slate-800">{deleteTarget.fullName}</strong> (
              <span className="font-mono text-slate-700">{deleteTarget.email}</span>)?
              Hành động này sẽ xóa vĩnh viễn quyền truy cập và dữ liệu liên quan.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
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
