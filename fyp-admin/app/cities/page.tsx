import { redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import CityManagement from "@/components/CityManagement";
import { getAdminToken } from "@/lib/auth";

export default async function CitiesPage() {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <AdminSidebar />
        </div>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <CityManagement />
          </div>
        </section>
      </div>
    </main>
  );
}