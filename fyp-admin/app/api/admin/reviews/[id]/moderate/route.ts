import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const ALLOWED_STATUSES = [
  "visible",
  "hidden",
  "rejected",
] as const;

type TargetStatus =
  (typeof ALLOWED_STATUSES)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const token = await getAdminToken();

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          message: "Review id is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request
      .json()
      .catch(() => null);

    const status =
      typeof body?.status === "string"
        ? body.status.toLowerCase()
        : "";

    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : "";

    if (
      !ALLOWED_STATUSES.includes(
        status as TargetStatus,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid moderation status.",
        },
        {
          status: 400,
        },
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        {
          message:
            "Moderation reason cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await backendFetch(
      `/admin/reviews/${encodeURIComponent(
        id,
      )}/moderate`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(reason ? { reason } : {}),
        }),
      },
    );

    const payload = await response
      .json()
      .catch(() => ({
        message:
          "Invalid response from backend.",
      }));

    return NextResponse.json(
      payload,
      {
        status: response.status,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to connect to the backend.",
      },
      {
        status: 500,
      },
    );
  }
}