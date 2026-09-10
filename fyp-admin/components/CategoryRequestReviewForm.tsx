"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  _id: string;
  name: string;
  isActive?: boolean;
  businessDetailsType?: string;
};

type Props = {
  requestId: string;
  requestedName: string;
  categories: Category[];
};

type ReviewAction =
  | "APPROVE"
  | "REJECT"
  | "MERGE";

const BUSINESS_TYPES = [
  "GENERIC",
  "PHOTOGRAPHY",
  "CATERING",
  "VENUE",
  "MAKEUP",
  "CAKE",
  "MEHNDI",
  "SOUND",
];

function getErrorMessage(data: any) {
  if (!data) {
    return "Unable to review category request.";
  }

  if (Array.isArray(data.message)) {
    return data.message.join(", ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (
    data.message &&
    typeof data.message === "object"
  ) {
    if (
      typeof data.message.message === "string"
    ) {
      return data.message.message;
    }

    if (
      Array.isArray(data.message.message)
    ) {
      return data.message.message.join(", ");
    }
  }

  return "Unable to review category request.";
}

export default function CategoryRequestReviewForm({
  requestId,
  requestedName,
  categories,
}: Props) {
  const router = useRouter();

  const [action, setAction] =
    useState<ReviewAction>("APPROVE");

  const [adminNote, setAdminNote] =
    useState("");

  const [businessDetailsType, setBusinessDetailsType] =
    useState("GENERIC");

  const [pictureUrl, setPictureUrl] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [mergeCategoryId, setMergeCategoryId] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.isActive !== false,
      ),
    [categories],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (action === "APPROVE") {
      if (!file && !pictureUrl.trim()) {
        setError(
          "Please upload an image or provide an image URL.",
        );
        return;
      }

      if (file && file.size > 10 * 1024 * 1024) {
        setError(
          "Category image must be 10 MB or smaller.",
        );
        return;
      }
    }

    if (
      action === "MERGE" &&
      !mergeCategoryId
    ) {
      setError(
        "Please select an existing category to merge into.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("action", action);

      if (adminNote.trim()) {
        formData.append(
          "adminNote",
          adminNote.trim(),
        );
      }

      if (action === "APPROVE") {
        formData.append(
          "businessDetailsType",
          businessDetailsType,
        );

        if (pictureUrl.trim()) {
          formData.append(
            "pictureUrl",
            pictureUrl.trim(),
          );
        }

        if (file) {
          formData.append(
            "file",
            file,
            file.name,
          );
        }
      }

      if (action === "MERGE") {
        formData.append(
          "mergeCategoryId",
          mergeCategoryId,
        );
      }

      const response = await fetch(
        `/api/admin/category-requests/${requestId}/review`,
        {
          method: "PATCH",
          body: formData,
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data),
        );
      }

      router.push("/categories");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to review category request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">
          Review Action
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              "APPROVE",
              "REJECT",
              "MERGE",
            ] as ReviewAction[]
          ).map((value) => {
            const selected =
              action === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAction(value);
                  setError("");
                }}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {value === "APPROVE"
                  ? "Approve"
                  : value === "REJECT"
                    ? "Reject"
                    : "Merge"}
              </button>
            );
          })}
        </div>
      </div>

      {action === "APPROVE" ? (
        <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div>
            <h3 className="font-bold text-slate-900">
              Create “{requestedName}”
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Approving will create this as a new
              active service category.
            </p>
          </div>

          <div>
            <label
              htmlFor="businessDetailsType"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Business Details Type
            </label>

            <select
              id="businessDetailsType"
              value={businessDetailsType}
              onChange={(event) =>
                setBusinessDetailsType(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              {BUSINESS_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Use GENERIC when no specialized
              business form is required.
            </p>
          </div>

          <div>
            <label
              htmlFor="categoryImage"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Category Image
            </label>

            <input
              id="categoryImage"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] ?? null;

                setFile(selectedFile);

                if (selectedFile) {
                  setPictureUrl("");
                }
              }}
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
            />

            {file ? (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Or
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <label
              htmlFor="pictureUrl"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Image URL
            </label>

            <input
              id="pictureUrl"
              type="url"
              value={pictureUrl}
              disabled={Boolean(file)}
              onChange={(event) =>
                setPictureUrl(
                  event.target.value,
                )
              }
              placeholder="https://example.com/category.jpg"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:bg-slate-100"
            />
          </div>
        </div>
      ) : null}

      {action === "REJECT" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="font-bold text-slate-900">
            Reject Request
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            The request will be marked as rejected
            and no category will be created.
          </p>
        </div>
      ) : null}

      {action === "MERGE" ? (
        <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
          <div>
            <h3 className="font-bold text-slate-900">
              Merge with Existing Category
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Use this when the requested service
              already belongs to an existing
              category.
            </p>
          </div>

          <div>
            <label
              htmlFor="mergeCategoryId"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Existing Category
            </label>

            <select
              id="mergeCategoryId"
              value={mergeCategoryId}
              onChange={(event) =>
                setMergeCategoryId(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">
                Select category
              </option>

              {activeCategories.map(
                (category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="adminNote"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Admin Note
        </label>

        <textarea
          id="adminNote"
          maxLength={300}
          rows={4}
          value={adminNote}
          onChange={(event) =>
            setAdminNote(event.target.value)
          }
          placeholder={
            action === "REJECT"
              ? "Reason for rejecting this request..."
              : "Optional internal review note..."
          }
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {adminNote.length}/300
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            router.push("/categories")
          }
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            action === "REJECT"
              ? "bg-red-600 hover:bg-red-700"
              : action === "MERGE"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {submitting
            ? "Saving..."
            : action === "APPROVE"
              ? "Approve & Create Category"
              : action === "REJECT"
                ? "Reject Request"
                : "Merge Request"}
        </button>
      </div>
    </form>
  );
}