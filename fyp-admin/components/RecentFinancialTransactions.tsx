 "use client";

import { useEffect, useState } from "react";

type Transaction = {
  transactionId: string;
  transactionDate: string;
  vendorName?: string | null;
  vendorId?: string | null;
  clientId?: string | null;
  transactionType: "BOOKING_PAYMENT" | "SUBSCRIPTION_PAYMENT";
  paymentMethod?: string | null;
  amount: number;
  status: string;
  reference?: string | null;
};

type TransactionsResponse = {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function RecentFinancialTransactions({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [result, setResult] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTransactions() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (appliedSearch) params.set("search", appliedSearch);

      try {
        const response = await fetch(
          `/api/admin/finance/transactions?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`Unable to load transactions (${response.status}).`);
        }

        const data: TransactionsResponse = await response.json();

        if (!controller.signal.aborted) {
          setResult(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load transactions.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => controller.abort();
 }, [page, type, status, appliedSearch, from, to, retryCount]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("en-PK", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Recent Financial Transactions
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Booking and subscription payment records. Booking payments are not
        platform revenue.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setStatus("");
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 p-2 text-sm"
        >
          <option value="">All transaction types</option>
          <option value="BOOKING_PAYMENT">Booking Payment</option>
          <option value="SUBSCRIPTION_PAYMENT">Subscription Payment</option>
        </select>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 p-2 text-sm"
        >
          <option value="">All statuses</option>
           <option value="PAID">Paid / Success</option>
         <option value="PENDING">Pending</option>
        <option value="FAILED">Failed</option>
        </select>

        <form
          className="flex gap-2 md:col-span-2"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedSearch(search.trim());
            setPage(1);
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transaction ID or reference"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 text-sm"
          />

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p role="status" className="mt-6 text-sm text-slate-500">
          Loading transactions...
        </p>
      ) : error ? (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
           <button
            type="button"
            onClick={() => setRetryCount((current) => current + 1)}
            className="ml-3 underline"
            >
            Retry
            </button>
        </div>
      ) : !result?.data.length ? (
        <p className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
          No transactions found for the selected filters.
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  {[
                    "Transaction Date",
                    "Transaction ID",
                    "Vendor / Client",
                    "Transaction Type",
                    "Payment Method",
                    "Amount",
                    "Status",
                    "Reference",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {result.data.map((transaction) => (
                  <tr key={`${transaction.transactionType}-${transaction.transactionId}`}>
                    <td className="whitespace-nowrap px-3 py-4">
                      {formatDate(transaction.transactionDate)}
                    </td>

                    <td className="px-3 py-4 font-mono text-xs">
                      {transaction.transactionId}
                    </td>

                    <td className="px-3 py-4">
                      <div>{transaction.vendorName || transaction.vendorId || "—"}</div>
                      {transaction.clientId && (
                        <div className="text-xs text-slate-500">
                          Client: {transaction.clientId}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      {transaction.transactionType === "BOOKING_PAYMENT"
                        ? "Booking Payment"
                        : "Subscription Payment"}
                    </td>

                    <td className="px-3 py-4">
                      {transaction.paymentMethod || "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 font-semibold">
                    Rs {Number(transaction.amount).toLocaleString("en-PK")}

                    {transaction.status !== "PAID" &&
                        transaction.status !== "SUCCESS" && (
                        <div className="text-xs font-normal text-slate-500">
                            {transaction.status === "FAILED"
                            ? "Not collected"
                            : "Amount due"}
                        </div>
                        )}
                    </td>

                    <td className="px-3 py-4">
                      {transaction.status}
                    </td>

                    <td className="px-3 py-4 font-mono text-xs">
                      {transaction.reference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Total: {result.pagination.total} transactions
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm">
                Page {result.pagination.page} of {result.pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}