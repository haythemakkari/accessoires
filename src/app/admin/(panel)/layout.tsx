import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Administration", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); // re-vérifie rôle + statut en base (le middleware ne lit que le JWT)
  if (!user || user.role !== "admin") redirect("/admin/login");
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
