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
  const [error, setError] = useState<string | null>(null);

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

      // Lưu token và thông tin user (kèm classroomId) vào Zustand
      setAuth(res.data.accessToken, res.data.user);
      console.log(res);
      const targetUrl = getRedirectUrlByRole(res.data.user.role, callbackUrl);
      router.push(targetUrl);
    } catch (err: any) {
      setError(err.message || "Tài khoản hoặc mật khẩu không chính xác.");
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ email: demoEmail, password: "password123" });

      // Lưu token và thông tin user (kèm classroomId) vào Zustand
      setAuth(res.data.accessToken, res.data.user);
      console.log(res);
      const targetUrl = getRedirectUrlByRole(res.data.user.role, callbackUrl);
      router.push(targetUrl);
    } catch (err: any) {
      setError(err.message || "Đăng nhập mẫu thất bại.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200 mb-3">
            <Code2 size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Online Judge
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Đăng nhập hệ thống chấm bài và xếp hạng học tập tự động
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-600 border border-rose-100 text-center">
            {error}
          </div>
        )}

        {/* Form đăng nhập */}
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
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-60 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                Đăng nhập <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Nút đăng nhập thử nghiệm nhanh theo các Role */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-blue-500" /> Đăng nhập mẫu theo Role
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("student01@gmail.com")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer text-center transition-colors"
            >
              Sinh viên
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@gmail.com")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 cursor-pointer text-center transition-colors"
            >
              Giảng viên
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@gmail.com")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 cursor-pointer text-center transition-colors"
            >
              Quản trị viên
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}>
      <LoginForm />
    </React.Suspense>
  );
}
