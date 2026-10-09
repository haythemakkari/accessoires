"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, MessageCircle, Package, Phone, Search, ShoppingBag, Tag, User as UserIcon, Store, X } from "lucide-react";
import { useCartDrawer } from "@/stores/cartDrawer";
import { NAV_GROUPS, groupHref, itemHref } from "@/lib/navigation";

type Viewer = { name: string; role: "admin" | "customer" } | null;

/** Menu mobile : panneau qui s'ouvre depuis la gauche (rendu dans <body> : l'en-tête collant crée son propre repère pour les éléments fixes). */
export function MobileMenu({ open, onClose, user, contactPhone, cartCount }: { open: boolean; onClose: () => void; user: Viewer; contactPhone: string; cartCount: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // la page derrière ne défile pas
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const digits = contactPhone.replace(/\D/g, "");
  const accountHref = user ? (user.role === "admin" ? "/admin" : "/account") : "/login";
  const row = "flex w-full items-center justify-between gap-3 border-b border-ink/10 px-5 py-4 text-left";

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand-100 text-brass-dark"><UserIcon size={20} /></span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{user?.name ? `Bonjour ${user.name.split(" ")[0]} !` : "Bonjour !"}</p>
            {user ? (
              <Link href={accountHref} onClick={onClose} className="font-medium text-brass-dark underline underline-offset-2">{user.role === "admin" ? "Administration" : "Mon compte"}</Link>
            ) : (
              <p><Link href="/login" onClick={onClose} className="font-medium text-brass-dark underline underline-offset-2">Se connecter</Link> · <Link href="/register" onClick={onClose} className="font-medium text-brass-dark underline underline-offset-2">Créer un compte</Link></p>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer le menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15"><X size={18} /></button>
        </div>

        <form role="search" className="border-b border-ink/10 px-5 py-4" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (!t) return; onClose(); router.push(`/products?q=${encodeURIComponent(t)}`); }}>
          <div className="flex overflow-hidden rounded-full border border-ink/15 bg-white focus-within:border-brass focus-within:ring-2 focus-within:ring-brass/25">
            <input value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" aria-label="Rechercher un produit" placeholder="Rechercher un produit…" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none placeholder:text-ink/40" />
            <button type="submit" aria-label="Rechercher" className="m-1 flex h-10 w-12 items-center justify-center rounded-full bg-ink text-sand-50"><Search size={18} /></button>
          </div>
        </form>

        <nav aria-label="Rayons">
          {NAV_GROUPS.map((g) => (
            <div key={g.gender}>
              <button type="button" aria-expanded={group === g.gender} onClick={() => setGroup(group === g.gender ? null : g.gender)} className={row}>
                <span className="font-semibold">{g.label}</span>
                <ChevronRight size={18} className={`text-brass-dark transition ${group === g.gender ? "rotate-90" : ""}`} />
              </button>
              {group === g.gender && (
                <ul className="border-b border-ink/10 bg-sand-50 px-5 py-2">
                  <li><Link href={groupHref(g)} onClick={onClose} className="block py-2.5 text-sm font-semibold">Tout voir · {g.label}</Link></li>
                  {g.items.map((i) => <li key={i.category}><Link href={itemHref(g, i)} onClick={onClose} className="block py-2.5 text-sm text-ink/75">{i.label}</Link></li>)}
                </ul>
              )}
            </div>
          ))}
          <Link href="/promotions" onClick={onClose} className={`${row} font-semibold text-clay`}><span className="flex items-center gap-3"><Tag size={18} /> Promotions</span><ChevronRight size={18} /></Link>
          <Link href="/products" onClick={onClose} className={`${row} font-semibold`}><span className="flex items-center gap-3"><Store size={18} /> Boutique</span><ChevronRight size={18} className="text-brass-dark" /></Link>
        </nav>

        <div className="m-5 overflow-hidden rounded-2xl border border-ink/10">
          <button type="button" onClick={() => { onClose(); useCartDrawer.getState().set(true); }} className="flex w-full items-center gap-3 border-b border-ink/10 px-4 py-3.5 text-left text-sm font-semibold"><ShoppingBag size={18} /> Mon panier{cartCount > 0 && <span className="ml-auto rounded-full bg-brass px-2 py-0.5 text-xs text-white">{cartCount}</span>}</button>
          <Link href="/service-client/suivi-commande" onClick={onClose} className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold"><Package size={18} /> Suivi de commande</Link>
        </div>

        {digits && (
          <div className="mx-5 mb-8 rounded-2xl bg-sand-100 p-4">
            <p className="mb-3 text-sm font-semibold">Besoin d’aide ?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <a href={`tel:+${digits}`} className="flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-2 py-3 text-sm font-semibold"><Phone size={16} /> {contactPhone}</a>
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-2 py-3 text-sm font-semibold text-emerald-700"><MessageCircle size={16} /> WhatsApp</a>
            </div>
            <Link href="/contact" onClick={onClose} className="mt-3 block text-center text-xs text-ink/60 underline underline-offset-4">Ou écrivez-nous</Link>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
