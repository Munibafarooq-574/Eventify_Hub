import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const query = request.nextUrl.searchParams.toString();

    const response = await backendFetch(
      `/admin/finance/transactions${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to load transactions." },
      { status: 502 },
    );
  }
}