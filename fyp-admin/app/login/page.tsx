"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({
        message: "Login failed.",
      }));

      if (!response.ok) {
  const errorMessage =
    typeof data?.message === "string"
      ? data.message
      : typeof data?.message?.message === "string"
        ? data.message.message
        : typeof data?.error === "string"
          ? data.error
          : "Unable to sign in.";

  setError(errorMessage);
  return;
}

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7fb]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-[#111827] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-[#111827]">
              E
            </div>

            <p className="mt-5 text-sm font-medium uppercase tracking-[0.24em] text-gray-400">
              Eventify Hub
            </p>
          </div>

          <div className="max-w-lg">
            <h1 className="text-5xl font-semibold leading-tight">
              Manage Eventify Hub from one secure workspace.
            </h1>

            <p className="mt-6 max-w-md text-lg leading-8 text-gray-300">
              Review bookings, vendors, clients,
              finance, disputes and platform operations
              from the Admin dashboard.
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Eventify Hub Administration
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] font-bold text-white">
                E
              </div>

              <p className="mt-3 font-semibold">
                Eventify Hub
              </p>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Admin Portal
            </p>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950">
              Welcome back
            </h2>

            <p className="mt-3 text-base leading-7 text-gray-600">
              Sign in with your authorized Eventify Hub
              administrator account.
            </p>

            <form
              className="mt-10 space-y-6"
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@example.com"
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-950 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#111827] px-5 font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Signing in..."
                  : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-gray-500">
              Access is restricted to authorized
              Eventify Hub administrators.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}