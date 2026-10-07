"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ImageIcon, LayoutDashboard, LogOut, Mail, Menu, Package, ShoppingCart, Settings, Tags, TicketPercent, Users, X } from "lucide-react";
import { fetcher } from "@/lib/client/fetcher";
import { NotificationBell } from "./NotificationBell";

const NAV = [
  { href: "/admin", l: "Tableau de bord", i: LayoutDashboard },
  { href: "/admin/orders", l: "Commandes", i: ShoppingCart },
  { href: "/admin/products", l: "Produits", i: Package },
  { href: "/admin/categories", l: "Catégories", i: Tags },
  { href: "/admin/customers", l: "Clients", i: Users },
  { href: "/admin/coupons", l: "Coupons", i: TicketPercent },
  { href: "/admin/messages", l: "Messages", i: Mail },
  { href: "/admin/homepage", l: "Page d'accueil", i: ImageIcon },
  { href: "/admin/settings", l: "Paramètres", i: Settings },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));

  const sidebar = (
    <nav className="flex h-full flex-col bg-slate-900 p-4 text-slate-300">
      <p className="mb-6 px-3 text-lg font-semibold tracking-wide text-white">Admin<span className="text-indigo-400">.</span></p>
      <div className="space-y-1">
        {NAV.map(({ href, l, i: Icon }) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active(href) ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}>
            <Icon size={18} /> {l}
          </Link>
        ))}
      </div>
      <Link href="/" target="_blank" className="mt-auto rounded-lg px-3 py-2 text-sm hover:bg-slate-800">Voir la boutique ↗</Link>
    </nav>
  );

  return (
    <div className="admin-theme min-h-screen bg-[var(--a-bg)] text-slate-800">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-60">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
          <span className="hidden text-sm text-slate-500 lg:block">Espace d’administration</span>
          <div className="flex items-center gap-3 text-sm">
            <NotificationBell />
            <span className="hidden text-slate-600 sm:inline">{name}</span>
            <button className="a-btn-ghost !px-2.5" onClick={async () => { await fetcher("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); }}><LogOut size={16} /> Quitter</button>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
