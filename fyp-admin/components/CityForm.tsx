"use client";

import {
  FormEvent,
  useState,
} from "react";

type City = {
  _id: string;
  name: string;
  countryCode: string;
  countryName: string;
  stateProvinceCode?: string;
  stateProvinceName?: string;
  isActive?: boolean;
};

type Props = {
  city?: City | null;
  onSaved: () => void;
  onCancel: () => void;
};

function extractMessage(
  data: unknown,
  fallback: string,
) {
  if (
    data &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message = (
      data as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(", ");
    }
  }

  return fallback;
}

export default function CityForm({
  city,
  onSaved,
  onCancel,
}: Props) {
  const editing = Boolean(city?._id);

  const [name, setName] =
    useState(city?.name || "");

  const [countryCode, setCountryCode] =
    useState(
      city?.countryCode || "PK",
    );

  const [countryName, setCountryName] =
    useState(
      city?.countryName || "Pakistan",
    );

  const [
    stateProvinceCode,
    setStateProvinceCode,
  ] = useState(
    city?.stateProvinceCode || "",
  );

  const [
    stateProvinceName,
    setStateProvinceName,
  ] = useState(
    city?.stateProvinceName || "",
  );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError(
        "City name is required.",
      );
      return;
    }

    if (!countryCode.trim()) {
      setError(
        "Country code is required.",
      );
      return;
    }

    if (!countryName.trim()) {
      setError(
        "Country name is required.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        editing
          ? `/api/admin/cities/${city!._id}`
          : "/api/admin/cities",
        {
          method: editing
            ? "PATCH"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),

            countryCode:
              countryCode
                .trim()
                .toUpperCase(),

            countryName:
              countryName.trim(),

            stateProvinceCode:
              stateProvinceCode
                .trim()
                .toUpperCase(),

            stateProvinceName:
              stateProvinceName.trim(),
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractMessage(
            data,
            editing
              ? "Unable to update city."
              : "Unable to create city.",
          ),
        );
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save city.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="city-name"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          City Name *
        </label>

        <input
          id="city-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
          placeholder="Islamabad"
          disabled={submitting}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="province-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            State / Province
          </label>

          <input
            id="province-name"
            value={stateProvinceName}
            onChange={(event) =>
              setStateProvinceName(
                event.target.value,
              )
            }
            placeholder="Punjab"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="province-code"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Province Code
          </label>

          <input
            id="province-code"
            value={stateProvinceCode}
            onChange={(event) =>
              setStateProvinceCode(
                event.target.value,
              )
            }
            placeholder="PB"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="country-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Country *
          </label>

          <input
            id="country-name"
            value={countryName}
            onChange={(event) =>
              setCountryName(
                event.target.value,
              )
            }
            required
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="country-code"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Country Code *
          </label>

          <input
            id="country-code"
            value={countryCode}
            onChange={(event) =>
              setCountryCode(
                event.target.value,
              )
            }
            required
            maxLength={3}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting
            ? "Saving..."
            : editing
              ? "Save Changes"
              : "Add City"}
        </button>
      </div>
    </form>
  );
}