"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, ShoppingBag, User as UserIcon } from "lucide-react";
import { useCart, cartCount } from "@/stores/cart";
import { useUser } from "@/stores/user";
import { asset } from "@/lib/assets";
import { MobileMenu } from "./MobileMenu";
import { CartDrawer } from "./CartDrawer";
import { AddedSheet } from "./AddedSheet";
import { useCartDrawer } from "@/stores/cartDrawer";
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

export function Header({ siteName, freeShippingThreshold, welcomeDiscount, contactPhone }: { siteName: string; freeShippingThreshold: number; welcomeDiscount: number; contactPhone: string }) {
  const count = useCart((s) => cartCount(s.lines));
  // Avant la réponse de /api/auth/me, le cookie « indice » dit déjà si un visiteur est connecté (et son rôle) : pas de clignotement.
  const storeUser = useUser((s) => s.user);
  const loaded = useUser((s) => s.loaded);
  const [hint, setHint] = useState<"a" | "c" | null>(null);
  useEffect(() => { setHint((document.cookie.match(/(?:^|; )ap_hint=([ac])/)?.[1] as "a" | "c" | undefined) ?? null); }, []);
  const user = loaded ? storeUser : hint ? { name: "", role: hint === "a" ? ("admin" as const) : ("customer" as const) } : null;
  const setCartOpen = useCartDrawer((st) => st.set);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition ${scrolled ? "bg-sand-50/90 shadow-sm backdrop-blur" : "bg-sand-50"}`}>
      <div className="bg-ink py-2 text-center text-xs tracking-[0.2em] text-sand-200">{[freeShippingThreshold > 0 && `LIVRAISON OFFERTE DÈS ${freeShippingThreshold} DT`, welcomeDiscount > 0 && `-${welcomeDiscount}% SUR VOTRE 1ʳᵉ COMMANDE EN CRÉANT UN COMPTE`].filter(Boolean).join(" · ")}</div>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <button type="button" onClick={() => setMenu(true)} aria-label="Menu" aria-expanded={menu} className="-ml-2 rounded-full p-2 hover:bg-sand-100 lg:hidden">
          <Menu size={24} />
        </button>
        <Link href="/" aria-label={`${siteName} — accueil`} className="shrink-0">
          {/* Logo en couleurs (noir + doré) sur fond transparent */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/logo.webp")} srcSet={`${asset("/logo-320.webp")} 320w, ${asset("/logo.webp")} 640w`} sizes="(max-width: 640px) 193px, 303px" alt={siteName} width={640} height={93} fetchPriority="high" className="h-7 w-auto sm:h-11" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm lg:flex" aria-label="Navigation principale">
          <Link href="/" className="hover:text-brass-dark">Accueil</Link>
          {NAV_GROUPS.map((g) => <Dropdown key={g.gender} group={g} />)}
          <Link href="/promotions" className="font-medium text-clay">Promotions</Link>
          <Link href="/products" className="hover:text-brass-dark">Boutique</Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"} aria-label={user ? (user.name ? `Mon compte (${user.name})` : "Mon compte") : "Se connecter"} className="hidden items-center gap-2 rounded-full p-2 lg:flex hover:bg-sand-100">
            <span className="relative"><UserIcon size={20} />{user && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sand-50 bg-emerald-500" />}</span>
            {user?.name && <span className="hidden max-w-24 truncate text-sm md:inline">{user.name.split(" ")[0]}</span>}
          </Link>
          <button type="button" onClick={() => setCartOpen(true)} aria-label="Panier" className="relative rounded-full p-2 hover:bg-sand-100">
            <ShoppingBag size={20} />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brass px-1 text-xs font-semibold text-white">{count}</span>
            )}
          </button>
        </div>
      </div>
      <CartDrawer />
      <AddedSheet />
      <MobileMenu open={menu} onClose={closeMenu} user={user} contactPhone={contactPhone} cartCount={mounted ? count : 0} />
    </header>
  );
}
