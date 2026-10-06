"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { useCart, cartCount } from "@/stores/cart";
import { useUser, type ClientUser } from "@/stores/user";
import { NAV_GROUPS, groupHref, itemHref, type NavGroup } from "@/lib/navigation";

function Dropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)} className="flex items-center gap-1 py-5 hover:text-brass-dark">
        {group.label}
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-0">
          <ul className="min-w-52 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
            <li><Link href={groupHref(group)} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-sm font-medium hover:bg-sand-100">Tout voir · {group.label}</Link></li>
            <li className="my-1 border-t border-ink/10" />
            {group.items.map((i) => (
              <li key={i.category}><Link href={itemHref(group, i)} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2 text-sm text-ink/75 hover:bg-sand-100 hover:text-ink">{i.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Header({ siteName, initialUser, freeShippingThreshold, welcomeDiscount }: { siteName: string; initialUser: ClientUser | null; freeShippingThreshold: number; welcomeDiscount: number }) {
  const count = useCart((s) => cartCount(s.lines));
  // Avant la 1ʳᵉ réponse de /api/auth/me, on utilise l'utilisateur lu côté serveur : pas de « faux déconnecté » après un rafraîchissement.
  const storeUser = useUser((s) => s.user);
  const loaded = useUser((s) => s.loaded);
  const user = loaded ? storeUser : initialUser;
  const [open, setOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`sticky top-0 z-40 transition ${scrolled ? "bg-sand-50/90 shadow-sm backdrop-blur" : "bg-sand-50"}`}>
      <div className="bg-ink py-2 text-center text-[11px] tracking-[0.2em] text-sand-200">{[freeShippingThreshold > 0 && `LIVRAISON OFFERTE DÈS ${freeShippingThreshold} DT`, welcomeDiscount > 0 && `-${welcomeDiscount}% SUR VOTRE 1ʳᵉ COMMANDE EN CRÉANT UN COMPTE`].filter(Boolean).join(" · ")}</div>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link href="/" aria-label={`${siteName} — accueil`} className="shrink-0">
          {/* Logo blanc sur fond transparent : affiché en foncé (brightness-0) sur l'en-tête clair */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={siteName} width={2400} height={349} className="h-7 w-auto brightness-0 sm:h-11" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm lg:flex" aria-label="Navigation principale">
          <Link href="/" className="hover:text-brass-dark">Accueil</Link>
          {NAV_GROUPS.map((g) => <Dropdown key={g.gender} group={g} />)}
          <Link href="/promotions" className="font-medium text-clay">Promotions</Link>
          <Link href="/products" className="hover:text-brass-dark">Boutique</Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"} aria-label={user ? `Mon compte (${user.name})` : "Se connecter"} className="flex items-center gap-2 rounded-full p-2 hover:bg-sand-100">
            <span className="relative"><UserIcon size={20} />{user && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sand-50 bg-emerald-500" />}</span>
            {user && <span className="hidden max-w-24 truncate text-sm md:inline">{user.name.split(" ")[0]}</span>}
          </Link>
          <Link href="/cart" aria-label="Panier" className="relative rounded-full p-2 hover:bg-sand-100">
            <ShoppingBag size={20} />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brass px-1 text-[11px] font-semibold text-white">{count}</span>
            )}
          </Link>
        </div>
      </div>
      {open && (
        <nav className="container-x max-h-[70vh] overflow-y-auto border-t border-ink/10 py-3 text-base lg:hidden" aria-label="Navigation mobile">
          <Link onClick={close} href="/" className="block py-2.5">Accueil</Link>
          {NAV_GROUPS.map((g) => (
            <div key={g.gender}>
              <button type="button" aria-expanded={mobileGroup === g.gender} onClick={() => setMobileGroup(mobileGroup === g.gender ? null : g.gender)} className="flex w-full items-center justify-between py-2.5">
                {g.label}
                <ChevronDown size={16} className={`transition ${mobileGroup === g.gender ? "rotate-180" : ""}`} />
              </button>
              {mobileGroup === g.gender && (
                <ul className="mb-2 ml-3 border-l border-ink/10 pl-4">
                  <li><Link onClick={close} href={groupHref(g)} className="block py-2 text-sm font-medium">Tout voir · {g.label}</Link></li>
                  {g.items.map((i) => <li key={i.category}><Link onClick={close} href={itemHref(g, i)} className="block py-2 text-sm text-ink/70">{i.label}</Link></li>)}
                </ul>
              )}
            </div>
          ))}
          <Link onClick={close} href="/promotions" className="block py-2.5 font-medium text-clay">Promotions</Link>
          <Link onClick={close} href="/products" className="block py-2.5">Boutique</Link>
        </nav>
      )}
    </header>
  );
}
