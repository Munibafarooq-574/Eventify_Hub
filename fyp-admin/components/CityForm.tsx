"use client";

import {
  FormEvent,
  useState,
} from "react";

const COUNTRIES = [
  { code: "PK", name: "Pakistan" },
  { code: "US", name: "United States" },
];

const US_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Adak",
  "Pacific/Honolulu",
];

type City = {
  _id: string;
  name: string;
  countryCode: string;
  countryName: string;
  stateProvinceCode?: string;
  stateProvinceName?: string;
  timeZone?: string;
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

  const [countryCode, setCountryCode] = useState(city?.countryCode || "PK");
  const [timeZone, setTimeZone] = useState(
    city?.timeZone || (countryCode === "PK" ? "Asia/Karachi" : ""),
  );
  const countries = city && !COUNTRIES.some(({ code }) => code === city.countryCode)
    ? [...COUNTRIES, { code: city.countryCode, name: city.countryName }]
    : COUNTRIES;

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

    const country = countries.find(({ code }) => code === countryCode);
    if (!country) {
      setError("Select a country.");
      return;
    }

    const cityTimeZone = timeZone.trim();
    if (!cityTimeZone) {
      setError("Enter the city's timezone.");
      return;
    }

    try {
      new Intl.DateTimeFormat("en", { timeZone: cityTimeZone });
    } catch {
      setError("Enter a valid IANA timezone, such as America/Los_Angeles.");
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

            countryCode: country.code,
            countryName: country.name,
            timeZone: cityTimeZone,

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
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
          <label htmlFor="country-code" className="mb-2 block text-sm font-semibold text-slate-700">
            Country *
          </label>
          <select
            id="country-code"
            value={countryCode}
            onChange={(event) => {
              const code = event.target.value;
              setCountryCode(code);
              setTimeZone(
                (code === city?.countryCode ? city.timeZone : undefined) ||
                  (code === "PK" ? "Asia/Karachi" : ""),
              );
            }}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          >
            {countries.map(({ code, name }) => (
              <option key={code} value={code}>{name} ({code})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="city-timezone" className="mb-2 block text-sm font-semibold text-slate-700">
            Timezone *
          </label>
          <input
            id="city-timezone"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            list={countryCode === "US" ? "us-timezones" : undefined}
            aria-describedby="city-timezone-help"
            placeholder={countryCode === "PK" ? "Asia/Karachi" : "America/Los_Angeles"}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
          />
          <datalist id="us-timezones">
            {US_TIME_ZONES.map((zone) => <option key={zone} value={zone} />)}
          </datalist>
          <p id="city-timezone-help" className="mt-2 text-xs text-slate-500">
            Use the city’s IANA timezone so booking times follow local daylight saving rules.
          </p>
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