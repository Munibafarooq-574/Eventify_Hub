import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { message: "Category ID is required." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    const response = await backendFetch(
      `/admin/categories/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json().catch(() => ({
      message: "Unable to update category.",
    }));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }
}