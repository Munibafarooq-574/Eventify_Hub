"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 10_000;

export default function ClientsAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}