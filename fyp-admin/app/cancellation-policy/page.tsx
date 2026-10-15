import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import CancellationPolicyForm from "@/components/CancellationPolicyForm";
import { verifyAdminSession } from "@/lib/auth";

export default async function CancellationPolicyPage() {
  const session = await verifyAdminSession();
  if (!session.authenticated) redirect("/login");
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white"><AdminSidebar /></div>
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl"><CancellationPolicyForm /></div>
        </section>
      </div>
    </main>
  );
}
