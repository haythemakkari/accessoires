import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/shop/LogoutButton";

const NAV = [
  { href: "/account", l: "Tableau de bord" },
  { href: "/account/orders", l: "Mes commandes" },
  { href: "/account/coupons", l: "Mes coupons" },
  { href: "/account/profile", l: "Informations" },
  { href: "/account/security", l: "Mot de passe" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside>
        <p className="eyebrow">Mon compte</p>
        <p className="h-display mt-1 text-2xl">{user.name}</p>
        <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm hover:bg-sand-100">{n.l}</Link>)}
          {user.role === "admin" && <Link href="/admin" className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-brass-dark hover:bg-sand-100">Administration</Link>}
          <LogoutButton />
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
