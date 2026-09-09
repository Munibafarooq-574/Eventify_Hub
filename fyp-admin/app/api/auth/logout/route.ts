import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_AUTH_COOKIE);

  return NextResponse.json({
    success: true,
  });
}