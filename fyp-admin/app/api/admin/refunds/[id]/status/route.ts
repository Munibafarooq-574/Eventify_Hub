import { NextRequest, NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const ALLOWED_STATUSES = [
  "PENDING",
  "PROCESSING",
  "REFUNDED",
  "REJECTED",
] as const;

type RefundStatus =
  (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const token = await getAdminToken();

  if (!token) {
    return NextResponse.json(
      {
        message: "Unauthorized.",
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
        message: "Refund ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const status = String(
    body?.status || "",
  ).toUpperCase() as RefundStatus;

  if (
    !ALLOWED_STATUSES.includes(status)
  ) {
    return NextResponse.json(
      {
        message: "Invalid refund status.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const response = await backendFetch(
      `/admin/finance/refunds/${encodeURIComponent(
        id,
      )}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
        }),
      },
    );

    const data = await response
      .json()
      .catch(() => null);

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      return NextResponse.json(
        {
          message: "Admin session expired.",
        },
        {
          status: response.status,
        },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            data?.message ||
            "Unable to update refund status.",
        },
        {
          status: response.status,
        },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to connect to the backend.",
      },
      {
        status: 502,
      },
    );
  }
}