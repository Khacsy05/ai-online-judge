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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden px-4 py-8 selection:bg-blue-500 selection:text-white">
      {/* Background Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-blue-600/20 blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-600/20 blur-[128px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Side: Brand Showcase & Value Props */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-blue-950/30">
          <div>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-6 backdrop-blur-md">
              <Sparkles size={13} className="text-blue-400 animate-pulse" />
              <span>Hệ thống Chấm bài & Đánh giá Lập trình bằng AI</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Nâng tầm kỹ năng lập trình <br />
              với <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Trợ lý AI Thông Minh</span>
            </h1>

            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-lg">
              Môi trường học tập và kiểm thử thuật toán thời gian thực. Tự động chấm điểm đa ngôn ngữ, phân tích thuật toán chuyên sâu và phát hiện lỗi tức thì.
            </p>

            {/* Feature List */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Code2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Chấm Sandbox Cô Lập 24/7</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Biên dịch C++, Java, Python, JavaScript tức thì với hàng đợi BullMQ và Judge0.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Gợi Ý & Sửa Lỗi Tự Động Bằng AI</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tích hợp mô hình Gemini AI phân tích AST, chỉ ra chính xác dòng code gây lỗi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Bảng Xếp Hạng & Báo Cáo Thời Gian Thực</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Theo dõi thứ hạng lớp học, độ chuyên cần và hiệu suất học tập của từng sinh viên.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Phiên bản 2.5 • Sẵn sàng cho Doanh nghiệp & Trường học</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Máy chủ trực tuyến
            </span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-center bg-slate-900/90">
          <div className="w-full max-w-sm mx-auto">
            {/* Form Title */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Đăng nhập tài khoản</h2>
              <p className="text-xs text-slate-400 mt-1">Sử dụng tài khoản nội bộ do trường hoặc quản trị viên cấp</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 rounded-xl bg-rose-500/10 p-3 text-xs font-medium text-rose-400 border border-rose-500/20 text-center animate-shake">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email tài khoản
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
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 disabled:opacity-60 cursor-pointer text-sm"
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

            {/* Quick Demo Logins */}
            <div className="mt-8 border-t border-slate-800 pt-5">
              <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-blue-400" /> Đăng nhập thử nghiệm nhanh
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("student01@gmail.com", "password123")}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white hover:border-blue-500/50 cursor-pointer text-center transition-all flex items-center justify-center gap-1.5"
                >
                  Sinh viên (Demo)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("giangvien@gmail.com", "giangvien123")}
                  className="rounded-xl border border-purple-500/30 bg-purple-950/20 px-3 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/40 hover:text-purple-200 hover:border-purple-500/60 cursor-pointer text-center transition-all flex items-center justify-center gap-1.5"
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
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}>
      <LoginForm />
    </React.Suspense>
  );
}
