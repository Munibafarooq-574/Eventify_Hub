import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token =
    request.cookies.get(ADMIN_AUTH_COOKIE)?.value;

  const isDashboardRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/");

  const isLoginRoute = pathname === "/login";

  if (isDashboardRoute && !token) {
    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }

  if (isLoginRoute && token) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};