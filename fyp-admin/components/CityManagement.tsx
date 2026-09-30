"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import CityForm from "@/components/CityForm";

type City = {
  _id: string;
  name: string;
  countryCode: string;
  countryName: string;
  stateProvinceCode?: string;
  stateProvinceName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

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

export default function CityManagement() {
  const [cities, setCities] =
    useState<City[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<StatusFilter>("ALL");

  const [showForm, setShowForm] =
    useState(false);

  const [editingCity, setEditingCity] =
    useState<City | null>(null);

  const [statusSavingId, setStatusSavingId] =
    useState<string | null>(null);

  const loadCities =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        if (status === "ACTIVE") {
          params.set(
            "isActive",
            "true",
          );
        }

        if (status === "INACTIVE") {
          params.set(
            "isActive",
            "false",
          );
        }

        const query =
          params.toString();

        const response = await fetch(
          `/api/admin/cities${
            query ? `?${query}` : ""
          }`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            extractMessage(
              data,
              "Unable to load cities.",
            ),
          );
        }

        setCities(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (err) {
        setCities([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load cities.",
        );
      } finally {
        setLoading(false);
      }
    }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadCities();
      },
      250,
    );

    return () =>
      window.clearTimeout(timer);
  }, [loadCities]);

  function openCreate() {
    setEditingCity(null);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(city: City) {
    setEditingCity(city);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingCity(null);
  }

  async function handleSaved() {
    setSuccess(
      editingCity
        ? "City updated successfully."
        : "City added successfully.",
    );

    closeForm();

    await loadCities();
  }

  async function handleStatusChange(
    city: City,
  ) {
    const nextStatus =
      !city.isActive;

    const message = nextStatus
      ? `Activate "${city.name}"?`
      : `Deactivate "${city.name}"? It will no longer appear in Business City, Service Cities or Event City active dropdowns.`;

    if (!window.confirm(message)) {
      return;
    }

    setStatusSavingId(city._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/cities/${city._id}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            isActive: nextStatus,
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
            "Unable to update city status.",
          ),
        );
      }

      setSuccess(
        nextStatus
          ? `${city.name} activated successfully.`
          : `${city.name} deactivated successfully.`,
      );

      await loadCities();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update city status.",
      );
    } finally {
      setStatusSavingId(null);
    }
  }

  const activeCount =
    cities.filter(
      (city) =>
        city.isActive !== false,
    ).length;

  const inactiveCount =
    cities.filter(
      (city) =>
        city.isActive === false,
    ).length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Core Management
          </p>

          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Cities
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Manage the canonical cities used for
            vendor business locations, service
            locations and client event locations.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add City
        </button>
      </div>

      {success ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Loaded Cities
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {cities.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Active
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Inactive
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {inactiveCount}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label
              htmlFor="city-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Search
            </label>

            <input
              id="city-search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search city, province or country..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="city-status"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Status
            </label>

            <select
              id="city-status"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              <option value="ALL">
                All
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  City
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Province / State
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Country
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading cities...
                  </td>
                </tr>
              ) : cities.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >
                    <p className="font-semibold text-slate-900">
                      No cities found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Add a city or change the current filters.
                    </p>
                  </td>
                </tr>
              ) : (
                cities.map((city) => (
                  <tr
                    key={city._id}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {city.name}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {city.stateProvinceName ||
                        "—"}

                      {city.stateProvinceCode
                        ? ` (${city.stateProvinceCode})`
                        : ""}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {city.countryName}

                      {city.countryCode
                        ? ` (${city.countryCode})`
                        : ""}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          city.isActive !==
                          false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {city.isActive !==
                        false
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(city)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={
                            statusSavingId ===
                            city._id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              city,
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            city.isActive !==
                            false
                              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {statusSavingId ===
                          city._id
                            ? "Saving..."
                            : city.isActive !==
                                false
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close city form"
            onClick={closeForm}
            className="absolute inset-0 bg-slate-950/50"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCity
                    ? "Edit City"
                    : "Add City"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {editingCity
                    ? "Update this marketplace city."
                    : "Add a city to Eventify Hub's marketplace locations."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <CityForm
                key={
                  editingCity?._id ||
                  "new-city"
                }
                city={editingCity}
                onSaved={() => {
                  void handleSaved();
                }}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}