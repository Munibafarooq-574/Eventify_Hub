import {
  NextRequest,
  NextResponse,
} from "next/server";

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
      {
        message:
          "City ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const body = await request.json();

    if (
      typeof body?.isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          message:
            "isActive must be a boolean.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await backendFetch(
      `/admin/cities/${encodeURIComponent(
        id,
      )}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          isActive: body.isActive,
        }),
      },
    );

    const data = await response
      .json()
      .catch(() => ({
        message:
          "Unable to update city status.",
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