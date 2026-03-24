import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";
import DashboardBackground from "@/components/DashboardBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/auth/login");

  return (
    <div className="flex min-h-screen">
      <DashboardBackground />
      <DashboardNav user={{ id: user.id, name: user.name }} />
      <main className="flex-1 ml-64 p-8 max-w-5xl relative z-10">
        {children}
      </main>
    </div>
  );
}
