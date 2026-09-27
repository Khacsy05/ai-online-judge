"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  GraduationCap,
  Hash,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStudentStore } from "@/store/useStudentStore";
import { updatePassword } from "@/services/auth.service";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const progress = useStudentStore((state) => state.progress);

  // Form Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loadingChangePass, setLoadingChangePass] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const displayName = user?.fullname || (user as any)?.name || "Sinh viên";
  const email = user?.email || "";
  const studentCode = user?.studentCode || "Chưa cập nhật";
  const classroomName =
    progress?.classroomName || user?.classrooms?.[0]?.name || "Chưa phân lớp";
  const classroomCode =
    progress?.classroomCode || user?.classrooms?.[0]?.code || "---";

  // Initials đại diện avatar
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Vui lòng điền đầy đủ tất cả các trường mật khẩu.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không trùng khớp với mật khẩu mới.");
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMessage("Mật khẩu mới không được trùng với mật khẩu cũ.");
      return;
    }

    setLoadingChangePass(true);
    try {
      const res = await updatePassword({
        email: email,
        oldPassword: oldPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      });

      const msg = res?.message || "Đổi mật khẩu thành công!";
      setSuccessMessage(msg);
      toast.success(msg);

      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoadingChangePass(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 space-y-8">
      {/* Tiêu đề trang */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5">
            <Sparkles size={13} /> Hồ sơ cá nhân
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Thông tin tài khoản
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Xem thông tin định danh sinh viên và quản lý bảo mật mật khẩu của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= CỘT TRÁI: THÔNG TIN SINH VIÊN (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {/* Header Card với Avatar Cover */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 pt-8 pb-14 text-center">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md">
                Tài khoản Sinh viên
              </span>
            </div>

            <div className="relative px-6 pb-6 text-center">
              {/* Avatar lớn */}
              <div className="mx-auto -mt-11 flex size-22 items-center justify-center rounded-2xl border-4 border-white bg-blue-50 text-2xl font-black text-blue-700 shadow-md">
                {initials || "SV"}
              </div>

              <h2 className="mt-3 text-lg font-bold text-slate-900">{displayName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{email}</p>

              {/* Thông số chi tiết */}
              <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100 text-left text-xs">
                {/* Mã sinh viên */}
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Hash size={14} className="text-slate-400" /> Mã sinh viên
                  </span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {studentCode}
                  </span>
                </div>

                {/* Email đăng nhập */}
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Mail size={14} className="text-slate-400" /> Email
                  </span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]" title={email}>
                    {email}
                  </span>
                </div>

                {/* Lớp học */}
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2 text-slate-500">
                    <GraduationCap size={14} className="text-slate-400" /> Lớp học
                  </span>
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {classroomCode} - {classroomName}
                  </span>
                </div>

                {/* Vai trò */}
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2 text-slate-500">
                    <ShieldCheck size={14} className="text-slate-400" /> Quyền hạn
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Học viên (STUDENT)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI: FORM ĐỔI MẬT KHẨU (7 cols) ================= */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu</h3>
                <p className="text-xs text-slate-400">
                  Cập nhật mật khẩu định kỳ để bảo vệ tài khoản nộp bài của bạn.
                </p>
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Thông báo thành công nếu có */}
            {successMessage && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-700">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4" autoComplete="off">
              {/* Fake hidden inputs triệt để để bẫy autofill của trình duyệt */}
              <input type="text" name="fake_username_remember" className="hidden" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_remember" className="hidden" tabIndex={-1} autoComplete="off" />

              {/* Mật khẩu cũ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    name="current_verification_token_pwd"
                    id="current_verification_token_pwd"
                    required
                    placeholder="Nhập mật khẩu đang sử dụng"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nút Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loadingChangePass}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loadingChangePass ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Cập nhật mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
