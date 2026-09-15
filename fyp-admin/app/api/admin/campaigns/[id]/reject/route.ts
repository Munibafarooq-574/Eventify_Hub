// fyp-admin/app/api/admin/campaigns/[id]/reject/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  reason?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Admin session expired.",
      },
      {
        status: 401,
      },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      {
        message: "Campaign ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      {
        message: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim()
      : "";

  if (!reason) {
    return NextResponse.json(
      {
        message: "A rejection reason is required.",
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
          "Rejection reason cannot exceed 500 characters.",
      },
      {
        status: 400,
      },
    );
  }

  const backendResponse = await backendFetch(
    `/admin/campaigns/${encodeURIComponent(id)}/reject`,
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
      }),
    },
  );

  let data: unknown = null;

  try {
    data = await backendResponse.json();
  } catch {
    data = null;
  }

  if (
    backendResponse.status === 401 ||
    backendResponse.status === 403
  ) {
    return NextResponse.json(
      {
        message: "Admin access denied.",
      },
      {
        status: backendResponse.status,
      },
    );
  }

  if (!backendResponse.ok) {
    const backendMessage =
      data &&
      typeof data === "object" &&
      "message" in data
        ? (data as { message?: unknown }).message
        : null;

    return NextResponse.json(
      {
        message:
          typeof backendMessage === "string"
            ? backendMessage
            : "Unable to reject campaign.",
      },
      {
        status: backendResponse.status,
      },
    );
  }

  return NextResponse.json(data);
}