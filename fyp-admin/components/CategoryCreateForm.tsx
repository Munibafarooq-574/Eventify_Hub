"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const BUSINESS_DETAILS_TYPES = [
  "GENERIC",
  "PHOTOGRAPHY",
  "CATERING",
  "VENUE",
  "MAKEUP",
  "CAKE",
  "MEHNDI",
  "SOUND",
] as const;

function getErrorMessage(data: any) {
  if (!data) {
    return "Unable to create category.";
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

  return "Unable to create category.";
}

export default function CategoryCreateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [businessDetailsType, setBusinessDetailsType] =
    useState("GENERIC");
  const [pictureUrl, setPictureUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const localPreviewUrl = useMemo(() => {
    if (!file) {
      return "";
    }

    return URL.createObjectURL(file);
  }, [file]);

  const previewUrl =
    localPreviewUrl || pictureUrl.trim();

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setError("");

    const selectedFile =
      event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      setFile(null);
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError(
        "Category image must be smaller than 10 MB.",
      );
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const trimmedName = name.trim();
    const trimmedPictureUrl =
      pictureUrl.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    if (!file && !trimmedPictureUrl) {
      setError(
        "Please upload an image or provide an image URL.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("name", trimmedName);

      if (description.trim()) {
        formData.append(
          "description",
          description.trim(),
        );
      }

      formData.append(
        "businessDetailsType",
        businessDetailsType,
      );

      if (trimmedPictureUrl) {
        formData.append(
          "pictureUrl",
          trimmedPictureUrl,
        );
      }

      if (file) {
        formData.append("file", file);
      }

      const response = await fetch(
        "/api/admin/categories",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setError(getErrorMessage(data));
        return;
      }

      const categoryId =
        data?._id ||
        data?.category?._id;

      router.refresh();

      if (categoryId) {
        router.push(
          `/categories/${categoryId}`,
        );
        return;
      }

      router.push("/categories");
    } catch (error) {
      console.error(
        "Category creation failed:",
        error,
      );

      setError(
        "Unable to create category. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="category-name"
            className="text-sm font-semibold text-slate-700"
          >
            Category Name
          </label>

          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Florist"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="business-details-type"
            className="text-sm font-semibold text-slate-700"
          >
            Business Details Type
          </label>

          <select
            id="business-details-type"
            value={businessDetailsType}
            onChange={(event) =>
              setBusinessDetailsType(
                event.target.value,
              )
            }
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {BUSINESS_DETAILS_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ),
            )}
          </select>

          <p className="text-xs text-slate-500">
            New/general services should normally use
            GENERIC unless they match an existing
            specialized business form.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="category-description"
          className="text-sm font-semibold text-slate-700"
        >
          Description
        </label>

        <textarea
          id="category-description"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Describe what this service category represents..."
          rows={5}
          disabled={submitting}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-5">
          <h3 className="font-semibold text-slate-900">
            Category Image
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Upload an image from your computer or provide
            an existing image URL.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="category-file"
              className="text-sm font-semibold text-slate-700"
            >
              Upload Image
            </label>

            <input
              id="category-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={submitting}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700 disabled:cursor-not-allowed"
            />

            <p className="text-xs text-slate-500">
              Maximum file size: 10 MB.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="picture-url"
              className="text-sm font-semibold text-slate-700"
            >
              Or Image URL
            </label>

            <input
              id="picture-url"
              type="url"
              value={pictureUrl}
              onChange={(event) =>
                setPictureUrl(event.target.value)
              }
              placeholder="https://example.com/image.jpg"
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        </div>

        {previewUrl ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Preview
            </p>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Category preview"
                className="h-64 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() =>
            router.push("/categories")
          }
          disabled={submitting}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Creating Category..."
            : "Create Category"}
        </button>
      </div>
    </form>
  );
}