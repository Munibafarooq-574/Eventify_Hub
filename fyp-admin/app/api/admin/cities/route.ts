import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

export async function GET(
  request: NextRequest,
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const query =
      request.nextUrl.searchParams.toString();

    const response = await backendFetch(
      `/admin/cities${
        query ? `?${query}` : ""
      }`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response
      .json()
      .catch(() => []);

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to load cities.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const response = await backendFetch(
      "/admin/cities",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response
      .json()
      .catch(() => ({
        message:
          "Unable to create city.",
      }));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }
}