import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_COOKIE,
  verifyAdminSession,
} from "@/lib/auth";

export async function GET() {
  const session = await verifyAdminSession();

  if (!session.authenticated) {
    const cookieStore = await cookies();

    cookieStore.set(ADMIN_AUTH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    authenticated: true,
  });
}
