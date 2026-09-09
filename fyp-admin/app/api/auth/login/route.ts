import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_COOKIE,
} from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type LoginBody = {
  email?: string;
  password?: string;
};

type BackendLoginResponse = {
  token?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    const loginResponse = await backendFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const loginData =
      (await loginResponse.json().catch(() => ({}))) as BackendLoginResponse;

    if (!loginResponse.ok || !loginData.token) {
      return NextResponse.json(
        {
          message:
            loginData.message ||
            "Invalid email or password.",
        },
        {
          status: loginResponse.status || 401,
        },
      );
    }

    const token = loginData.token;

    /*
     * Do not trust only the token payload here.
     * Ask the NestJS backend to authorize this JWT against
     * the protected Admin endpoint.
     */
    const adminCheck = await backendFetch("/admin/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!adminCheck.ok) {
      return NextResponse.json(
        {
          message: "This account does not have Admin access.",
        },
        {
          status: 403,
        },
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(ADMIN_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        message:
          "Unable to connect to the authentication server.",
      },
      {
        status: 500,
      },
    );
  }
}