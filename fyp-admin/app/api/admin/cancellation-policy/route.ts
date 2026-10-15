import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

async function forward(method: "GET" | "PATCH", body?: unknown) {
  const token = await getAdminToken();
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const response = await backendFetch("/cancellation/policy-config", {
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(method === "PATCH" ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Unable to reach cancellation policy service." }, { status: 502 });
  }
}
export async function GET() { return forward("GET"); }
export async function PATCH(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Invalid JSON." }, { status: 400 }); }
  return forward("PATCH", body);
}
