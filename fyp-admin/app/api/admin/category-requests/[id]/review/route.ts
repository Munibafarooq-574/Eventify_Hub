import { NextRequest, NextResponse } from "next/server";
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
  try {
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
        { message: "Category request ID is required." },
        { status: 400 },
      );
    }

    const incomingFormData = await request.formData();
    const formData = new FormData();

    const action = incomingFormData.get("action");
    const adminNote = incomingFormData.get("adminNote");
    const mergeCategoryId =
      incomingFormData.get("mergeCategoryId");
    const pictureUrl =
      incomingFormData.get("pictureUrl");
    const businessDetailsType =
      incomingFormData.get("businessDetailsType");
    const file = incomingFormData.get("file");

    if (typeof action === "string" && action.trim()) {
      formData.append("action", action);
    }

    if (
      typeof adminNote === "string" &&
      adminNote.trim()
    ) {
      formData.append("adminNote", adminNote.trim());
    }

    if (
      typeof mergeCategoryId === "string" &&
      mergeCategoryId.trim()
    ) {
      formData.append(
        "mergeCategoryId",
        mergeCategoryId,
      );
    }

    if (
      typeof pictureUrl === "string" &&
      pictureUrl.trim()
    ) {
      formData.append(
        "pictureUrl",
        pictureUrl.trim(),
      );
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
      `/admin/category-requests/${id}/review`,
      {
        method: "PATCH",
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
          response.statusText ||
          "Unable to review category request.",
      },
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error(
      "Category request review error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Unable to review category request.",
      },
      {
        status: 500,
      },
    );
  }
}