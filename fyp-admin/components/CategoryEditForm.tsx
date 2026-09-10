"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  _id: string;
  name: string;
  normalizedName?: string;
  image?: string;
  description?: string;
  businessDetailsType?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  category: Category;
};

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

function extractMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const value = data as {
    message?: unknown;
  };

  if (typeof value.message === "string") {
    return value.message;
  }

  if (
    value.message &&
    typeof value.message === "object"
  ) {
    const nested = value.message as {
      message?: unknown;
    };

    if (typeof nested.message === "string") {
      return nested.message;
    }
  }

  return fallback;
}

export default function CategoryEditForm({
  category,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(category.name || "");
  const [description, setDescription] = useState(
    category.description || "",
  );
  const [pictureUrl, setPictureUrl] = useState(
    category.image || "",
  );
  const [businessDetailsType, setBusinessDetailsType] =
    useState(category.businessDetailsType || "GENERIC");

  const [isActive, setIsActive] = useState(
    category.isActive !== false,
  );

  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] =
    useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/categories/${category._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            pictureUrl: pictureUrl.trim(),
            businessDetailsType,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractMessage(
            data,
            "Unable to update category.",
          ),
        );
      }

      setSuccess("Category updated successfully.");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update category.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange() {
    const nextStatus = !isActive;

    const confirmationMessage = nextStatus
      ? `Activate "${category.name}"?`
      : `Deactivate "${category.name}"? It will no longer appear in the public active category list.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setStatusSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/categories/${category._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractMessage(
            data,
            "Unable to update category status.",
          ),
        );
      }

      setIsActive(nextStatus);

      setSuccess(
        nextStatus
          ? "Category activated successfully."
          : "Category deactivated successfully.",
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update category status.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">
            Category Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update the category information used throughout
            Eventify Hub.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Category Name
            </label>

            <input
              id="name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              maxLength={100}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={5}
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              GENERIC is used for categories that do not
              require one of the existing specialized
              business-detail forms.
            </p>
          </div>

          <div>
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
              onChange={(event) =>
                setPictureUrl(event.target.value)
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Real file upload will be connected through the
              Admin Web image workflow separately.
            </p>
          </div>

          {pictureUrl ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Image Preview
              </p>

              <div className="h-40 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pictureUrl}
                  alt={name || "Category"}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">
            Category Status
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Deactivation hides the category from the public
            active category list without deleting historical
            references.
          </p>
        </div>

        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>

            <p className="mt-2 text-sm text-slate-500">
              {isActive
                ? "This category is currently available to the platform."
                : "This category is currently hidden from the public active category list."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleStatusChange}
            disabled={statusSaving}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {statusSaving
              ? "Updating..."
              : isActive
                ? "Deactivate Category"
                : "Activate Category"}
          </button>
        </div>
      </div>
    </div>
  );
}