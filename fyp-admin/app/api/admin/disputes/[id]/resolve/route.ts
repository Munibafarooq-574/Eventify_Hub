import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const RESOLUTIONS = [
  "RESOLVED_ORGANIZER",
  "RESOLVED_VENDOR",
  "RESOLVED_PARTIAL",
] as const;

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      { message: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json(
      { message: "Invalid dispute ID." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);

  const resolution = body?.resolution;

  if (
    !RESOLUTIONS.includes(
      resolution as (typeof RESOLUTIONS)[number],
    )
  ) {
    return NextResponse.json(
      { message: "Invalid resolution." },
      { status: 400 },
    );
  }

  if (
    body?.notes !== undefined &&
    typeof body.notes !== "string"
  ) {
    return NextResponse.json(
      { message: "Invalid resolution notes." },
      { status: 400 },
    );
  }

  if (
    resolution === "RESOLVED_PARTIAL" &&
    (typeof body?.partialRefundAmount !== "number" ||
      !Number.isFinite(body.partialRefundAmount) ||
      body.partialRefundAmount <= 0)
  ) {
    return NextResponse.json(
      { message: "Invalid partial refund amount." },
      { status: 400 },
    );
  }

  try {
    const response = await backendFetch(
      `/admin/disputes/${encodeURIComponent(id)}/resolve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resolution,
          notes: body.notes,
          ...(resolution === "RESOLVED_PARTIAL"
            ? {
                partialRefundAmount: body.partialRefundAmount,
              }
            : {}),
        }),
      },
    );

    const data = await response.json().catch(() => null);

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { message: "Admin session expired." },
        { status: response.status },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            typeof data?.message === "string"
              ? data.message
              : "Unable to resolve dispute.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to the backend." },
      { status: 502 },
    );
  }
}