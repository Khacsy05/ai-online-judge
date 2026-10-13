"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Code2, Lock, Mail, Loader2, ArrowRight, Sparkles, UserCheck } from "lucide-react";
import { loginUser } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("student01@gmail.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setIsLoggingOut = useAuthStore((state) => state.setIsLoggingOut);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setIsLoggingOut(false);
  }, [setIsLoggingOut]);

  // Điều hướng người dùng theo đúng Role sau khi đăng nhập thành công
  const getRedirectUrlByRole = (role: string, customCallback?: string | null) => {
    if (customCallback && customCallback !== "/" && customCallback !== "/login") {
      return customCallback;
    }
    if (role === "ADMIN") return "/admin";
    if (role === "LECTURER") return "/lecturer";
    return "/student";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ email, password });

      // 1. Lưu token vào Cookie để Next.js Middleware nhận diện ngay lập tức
      if (typeof window !== "undefined") {
        document.cookie = `access_token=${res.data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      // 2. Lưu token và thông tin user (kèm classroomId) vào Zustand
      setAuth(res.data.accessToken, res.data.user);
      console.log(res);

      const targetUrl = getRedirectUrlByRole(res.data.user.role, callbackUrl);
      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err.message || "Tài khoản hoặc mật khẩu không chính xác.");
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword = "password123") => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ email: demoEmail, password: demoPassword });

      // 1. Lưu token vào Cookie để Next.js Middleware nhận diện ngay lập tức
      if (typeof window !== "undefined") {
        document.cookie = `access_token=${res.data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }

      // 2. Lưu token và thông tin user (kèm classroomId) vào Zustand
      setAuth(res.data.accessToken, res.data.user);
      console.log(res);

      const targetUrl = getRedirectUrlByRole(res.data.user.role, callbackUrl);
      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err.message || "Đăng nhập mẫu thất bại.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f6f9] p-4 sm:p-6 lg:p-8 text-slate-900">
      {/* Main Container - Split Layout Light Theme */}
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Cột trái: Giới thiệu tính năng & Thương hiệu (Tone Trắng / Xanh Dương thanh lịch) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 bg-gradient-to-br from-slate-50/80 via-blue-50/30 to-indigo-50/20">
          <div>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/70 px-3.5 py-1 text-xs font-semibold text-blue-700 mb-6">
              <Sparkles size={14} className="text-blue-600" />
              <span>Hệ thống Chấm bài & Đánh giá Lập trình bằng AI</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Nâng tầm kỹ năng lập trình <br />
              với <span className="text-blue-600">Trợ lý AI Thông Minh</span>
            </h1>

            <p className="mt-3.5 text-sm text-slate-500 leading-relaxed max-w-lg">
              Môi trường học tập và kiểm thử thuật toán thời gian thực. Tự động chấm điểm đa ngôn ngữ, phân tích thuật toán chuyên sâu và phát hiện lỗi tức thì.
            </p>

            {/* Danh sách tính năng nổi bật */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5 p-3 rounded-2xl transition-colors hover:bg-white/80 border border-transparent hover:border-slate-200/60">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
                  <Code2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Chấm Sandbox Cô Lập 24/7</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Biên dịch C++, Java, Python, JavaScript tức thì với hàng đợi BullMQ và Judge0.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl transition-colors hover:bg-white/80 border border-transparent hover:border-slate-200/60">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Gợi Ý & Sửa Lỗi Tự Động Bằng AI</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tích hợp mô hình Gemini AI phân tích AST, chỉ ra chính xác dòng code gây lỗi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl transition-colors hover:bg-white/80 border border-transparent hover:border-slate-200/60">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Bảng Xếp Hạng & Báo Cáo Thời Gian Thực</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Theo dõi thứ hạng lớp học, độ chuyên cần và hiệu suất học tập của từng sinh viên.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info bên trái */}
          <div className="mt-8 pt-6 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
            <span>Phiên bản 2.5 • Sẵn sàng cho Doanh nghiệp & Trường học</span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Máy chủ trực tuyến
            </span>
          </div>
        </div>

        {/* Cột phải: Form Đăng nhập Tone Trắng Hiện Đại */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="w-full max-w-sm mx-auto">
            {/* Header Form */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập tài khoản</h2>
              <p className="text-xs text-slate-500 mt-1">Sử dụng tài khoản nội bộ do trường hoặc quản trị viên cấp</p>
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-600 border border-rose-100 text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email trường cấp
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student01@gmail.com"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-60 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Đăng nhập hệ thống <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Nút đăng nhập thử nghiệm nhanh */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1">
                <Sparkles size={12} className="text-blue-500" /> Đăng nhập mẫu theo Role
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("student01@gmail.com", "password123")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  Sinh viên (Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("giangvien@gmail.com", "giangvien123")}
                  className="rounded-xl border border-purple-200 bg-purple-50/50 px-2.5 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100/70 hover:border-purple-300 cursor-pointer text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  Giảng viên / Admin
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
      <LoginForm />
    </React.Suspense>
  );
}
