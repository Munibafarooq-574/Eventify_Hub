// fyp-admin/app/api/admin/booking-payments/[id]/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  action?: unknown;
  transactionRef?: unknown;
  reason?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Admin session expired." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { message: "Payment ID is required." },
      { status: 400 },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const action =
    typeof body.action === "string"
      ? body.action.toUpperCase()
      : "";

  if (action !== "CONFIRM" && action !== "FAIL") {
    return NextResponse.json(
      { message: "Action must be CONFIRM or FAIL." },
      { status: 400 },
    );
  }

  const transactionRef =
    typeof body.transactionRef === "string"
      ? body.transactionRef.trim()
      : "";

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim()
      : "";

  if (action === "FAIL" && !reason) {
    return NextResponse.json(
      { message: "Failure reason is required." },
      { status: 400 },
    );
  }

  const path =
    action === "CONFIRM"
      ? `/payment/${encodeURIComponent(id)}/confirm`
      : `/payment/${encodeURIComponent(id)}/fail`;

  const backendResponse = await backendFetch(path, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      action === "CONFIRM"
        ? {
            transactionRef:
              transactionRef ||
              `ADMIN-${Date.now()}`,
          }
        : {
            reason,
          },
    ),
  });

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
      { message: "Admin access denied." },
      { status: backendResponse.status },
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
            : "Unable to resolve booking payment.",
      },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(data);
}
