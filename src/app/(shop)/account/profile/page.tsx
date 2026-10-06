import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/shop/AccountForms";

export const metadata = { title: "Mes informations", robots: { index: false } };

export default async function ProfilePage() {
  const u = await requireUser();
  return (<div><h1 className="h-display mb-6 text-3xl">Informations personnelles</h1><ProfileForm name={u.name} phone={u.phone ?? ""} email={u.email} /></div>);
}
