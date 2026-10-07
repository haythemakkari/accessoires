import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/shop/LogoutButton";

const NAV = [
  { href: "/account", l: "Tableau de bord" },
  { href: "/account/orders", l: "Mes commandes" },
  { href: "/account/profile", l: "Informations" },
];

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="container-x grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside className="contents lg:block">
        <div>
          <p className="eyebrow">Mon compte</p>
          <p className="h-display mt-1 text-2xl">{user.name}</p>
        </div>
        {/* Téléphone : le menu passe sous le contenu de la page ; ordinateur : colonne à gauche */}
        <nav className="order-last flex flex-wrap gap-2 border-t border-ink/10 pt-4 lg:order-none lg:mt-6 lg:flex-col lg:gap-1 lg:border-0 lg:pt-0">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-xl border border-ink/15 px-3 py-2.5 text-xs font-medium hover:bg-sand-100 sm:text-sm lg:border-transparent lg:px-4 lg:py-2.5 lg:font-normal">{n.l}</Link>)}
          {user.role === "admin" && <Link href="/admin" className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-brass-dark hover:bg-sand-100">Administration</Link>}
          <LogoutButton className="whitespace-nowrap rounded-xl border border-clay/30 px-3 py-2.5 text-xs font-medium text-clay hover:bg-sand-100 sm:text-sm lg:border-transparent lg:px-4 lg:text-left lg:font-normal" />
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
