import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // السماح للملفات العامة وملفات النظام
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // قراءة الكوكي
  const isAuthed = req.cookies.get("site_auth")?.value === "1";

  if (isAuthed) {
    // مسجل دخول → نسمح له يكمل
    return NextResponse.next();
  }

  // لو مو مسجل دخول → نرسله على /login
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

// نطبّق الميدل وير على كل الروابط تقريباً
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
