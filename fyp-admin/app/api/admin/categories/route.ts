//fyp-admin/app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

export async function POST(request: NextRequest) {
  try {
    const token = await getAdminToken();

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const incomingFormData = await request.formData();

    const formData = new FormData();

    const name = incomingFormData.get("name");
    const description = incomingFormData.get("description");
    const businessDetailsType =
      incomingFormData.get("businessDetailsType");
    const pictureUrl = incomingFormData.get("pictureUrl");
    const file = incomingFormData.get("file");

    if (typeof name === "string") {
      formData.append("name", name);
    }

    if (typeof description === "string" && description.trim()) {
      formData.append("description", description);
    }

    if (
      typeof businessDetailsType === "string" &&
      businessDetailsType.trim()
    ) {
      formData.append(
        "businessDetailsType",
        businessDetailsType,
      );
    }

    if (
      typeof pictureUrl === "string" &&
      pictureUrl.trim()
    ) {
      formData.append("pictureUrl", pictureUrl);
    }

    if (
  file &&
  typeof file !== "string" &&
  file.size > 0
) {
  formData.append(
    "file",
    file,
    file.name,
  );
}
    const response = await backendFetch(
      "/admin/categories",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(
      data ?? {
        message:
          response.statusText || "Unable to create category.",
      },
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error("Create category error:", error);

    return NextResponse.json(
      {
        message: "Unable to create category.",
      },
      {
        status: 500,
      },
    );
  }
}