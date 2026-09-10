// fyp-admin/app/api/admin/subscription-payments/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  status?: unknown;
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
        message: "Subscription payment ID is required.",
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

  const status =
    typeof body.status === "string"
      ? body.status.toUpperCase()
      : "";

  if (
    status !== "PAID" &&
    status !== "FAILED"
  ) {
    return NextResponse.json(
      {
        message:
          "Status must be PAID or FAILED.",
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

  if (
    status === "FAILED" &&
    !reason
  ) {
    return NextResponse.json(
      {
        message:
          "A rejection reason is required.",
      },
      {
        status: 400,
      },
    );
  }

  const backendResponse =
    await backendFetch(
      `/admin/finance/subscription-payments/${encodeURIComponent(
        id,
      )}/status`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          ...(status === "FAILED"
            ? {
                reason,
              }
            : {}),
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
            : "Unable to review subscription payment.",
      },
      {
        status: backendResponse.status,
      },
    );
  }

  return NextResponse.json(data);
}