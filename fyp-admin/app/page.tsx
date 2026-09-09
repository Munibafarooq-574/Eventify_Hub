import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await verifyAdminSession();

  if (session.authenticated) {
    redirect("/dashboard");
  }

  redirect("/login");
}