// fyp-admin/app/api/admin/campaigns/[id]/approve/route.ts

import { NextResponse } from "next/server";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  _request: Request,
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

  const backendResponse = await backendFetch(
    `/admin/campaigns/${encodeURIComponent(id)}/approve`,
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
            : "Unable to approve campaign.",
      },
      {
        status: backendResponse.status,
      },
    );
  }

  return NextResponse.json(data);
}