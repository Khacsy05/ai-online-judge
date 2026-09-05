import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getRoleFromToken(token: string): string | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const decodedJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const payload = JSON.parse(decodedJson);
    return payload.role || null;
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lấy token từ Cookie (Ưu tiên access_token set từ frontend, sau đó mới tới refreshToken)
  const token =
    request.cookies.get("access_token")?.value ||
    request.cookies.get("refreshToken")?.value;

  const role = token ? getRoleFromToken(token) : null;

  // Xác định các trang bảo vệ
  const isStudentPath = pathname.startsWith("/student");
  const isLecturerPath = pathname.startsWith("/lecturer");
  const isAdminPath = pathname.startsWith("/admin");
  const isProtectedPath = isStudentPath || isLecturerPath || isAdminPath;
  const isAuthPath =
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  // 1. Chưa đăng nhập mà truy cập trang bảo vệ -> Chuyển sang /auth/login
  if (!token && isProtectedPath) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Đã đăng nhập mà truy cập trang login -> Chuyển về trang theo đúng Role
  if (token && isAuthPath) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", request.url));
    } else if (role === "LECTURER") {
      return NextResponse.redirect(new URL("/lecturer", request.url));
    } else if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/student", request.url));
  }

  // 3. Bảo vệ phân quyền giữa các Role (Role-based Authorization)
  if (token && role) {
    // Sinh viên cố tình vào trang Admin/Lecturer -> Đẩy về /student
    if (role === "STUDENT" && (isAdminPath || isLecturerPath)) {
      return NextResponse.redirect(new URL("/student", request.url));
    }

    // Giảng viên cố tình vào trang Admin hệ thống -> Đẩy về /lecturer
    if (role === "LECTURER" && isAdminPath) {
      return NextResponse.redirect(new URL("/lecturer", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/admin/:path*",
    "/lecturer/:path*",
    "/login",
    "/auth/login",
    "/register",
  ],
};
