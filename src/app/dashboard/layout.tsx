import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/auth/login");

  return (
    <div className="flex min-h-screen">
      <DashboardNav user={{ id: user.id, name: user.name }} />
      <main className="flex-1 ml-64 p-8 max-w-5xl">
        {children}
      </main>
    </div>
  );
}
