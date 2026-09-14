import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminToken,
} from "@/lib/auth";

import {
  backendFetch,
} from "@/lib/backend";

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
    const token =
      await getAdminToken();

    if (!token) {
      return NextResponse.json(
        {
          message:
            "Admin authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      id,
    } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          message:
            "Vendor ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    if (
      body?.status !==
        "APPROVED" &&
      body?.status !==
        "REJECTED"
    ) {
      return NextResponse.json(
        {
          message:
            "Status must be APPROVED or REJECTED.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.status ===
        "REJECTED" &&
      !String(
        body?.reason || "",
      ).trim()
    ) {
      return NextResponse.json(
        {
          message:
            "Rejection reason is required.",
        },
        {
          status: 400,
        },
      );
    }

    const backendResponse =
      await backendFetch(
        `/admin/vendors/${encodeURIComponent(
          id,
        )}/approval`,
        {
          method: "PATCH",

          cache: "no-store",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              status:
                body.status,

              reason:
                body.status ===
                "REJECTED"
                  ? String(
                      body.reason,
                    ).trim()
                  : undefined,
            }),
        },
      );

    let data: any = null;

    try {
      data =
        await backendResponse.json();
    } catch {
      data = {
        message:
          backendResponse.ok
            ? "Vendor review completed."
            : "Unable to review vendor.",
      };
    }

    return NextResponse.json(
      data,
      {
        status:
          backendResponse.status,
      },
    );
  } catch (error) {
    console.error(
      "Vendor approval API error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Unable to process vendor approval.",
      },
      {
        status: 500,
      },
    );
  }
}