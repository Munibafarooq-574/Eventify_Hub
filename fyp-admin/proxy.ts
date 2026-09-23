import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token =
    request.cookies.get(ADMIN_AUTH_COOKIE)?.value;

  const isLoginRoute = pathname === "/login";

  if (!token && !isLoginRoute) {
    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }

  if (token && isLoginRoute) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/analytics/:path*",
    "/bookings/:path*",
    "/campaigns/:path*",
    "/categories/:path*",
    "/clients/:path*",
    "/disputes/:path*",
    "/finance/:path*",
    "/payments/:path*",
    "/refunds/:path*",
    "/reviews/:path*",
    "/subscriptions/:path*",
    "/vendors/:path*",
    "/vendor-subscriptions/:path*",
    "/login",
  ],
};
