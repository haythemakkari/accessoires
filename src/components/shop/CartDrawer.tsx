"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Banknote, ChevronDown, ChevronRight, Minus, Plus, RefreshCcw, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { cartCount, cartSubtotal, useCart } from "@/stores/cart";
import { useCartDrawer } from "@/stores/cartDrawer";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import { CouponBox } from "@/components/shop/CouponBox";
import { Totals } from "@/components/shop/Totals";
import { useQuote } from "@/lib/client/useQuote";
import { canPickInline, useQuickAddSimilar, useQuickAddVariant, useSimilar } from "@/lib/client/similar";
import { VariantPicker } from "./VariantPicker";

/** Panneau « Mon panier » qui s'ouvre depuis la droite (rendu dans <body> : l'en-tête collant crée son propre repère pour les éléments fixes). */
export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const setOpen = useCartDrawer((s) => s.set);
  const lines = useCart((s) => s.lines);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname, setOpen]); // changement de page : on referme

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, setOpen]);

  if (!mounted || !open) return null;
  const close = () => setOpen(false);
  const count = cartCount(lines);

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Mon panier">
      <div className="absolute inset-0 bg-ink/50" onClick={close} />
      <div className="drawer-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-sand-50 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-ink/10 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Mon panier</h2>
            {count > 0 && <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-brass-dark">{count} article{count > 1 ? "s" : ""}</span>}
          </div>
          <button onClick={close} aria-label="Fermer le panier" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 hover:bg-sand-100"><X size={20} /></button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-brass-dark"><ShoppingBag size={28} /></span>
            <p className="h-display mt-5 text-2xl">Votre panier est vide</p>
            <p className="mt-2 text-sm text-ink/60">Découvrez notre sélection d’accessoires.</p>
            <Link href="/products" onClick={close} className="btn-primary mt-6">Parcourir la boutique</Link>
          </div>
        ) : (
          <>
            <Body close={close} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Contenu du panier : monté seulement quand le panneau est ouvert (le devis serveur n'est donc demandé qu'à ce moment-là). */
function Body({ close }: { close: () => void }) {
  const { lines, setQty, remove } = useCart();
  const { quote, error, loading } = useQuote();
  const couponCode = useCart((s) => s.couponCode);
  const [promoOpen, setPromoOpen] = useState(false);
  return (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="relative flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <Link href={`/products/${l.slug}`} onClick={close} className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-sand-100"><ProductImage src={l.image} alt={l.name} sizes="80px" /></Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/products/${l.slug}`} onClick={close} className="line-clamp-2 pr-9 text-sm font-semibold hover:text-brass-dark">{l.name}</Link>
                    {(l.variant || l.packagingName) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {l.variant?.split(" / ").map((v) => <span key={v} className="rounded-md bg-sand-100 px-2 py-0.5 text-xs font-medium">{v}</span>)}
                        {l.packagingName && <span className="rounded-md bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass-dark">Packaging {l.packagingName}{l.packagingPrice ? ` · +${formatPrice(l.packagingPrice)}` : ""}</span>}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-full border border-ink/20">
                        <button className="p-2 disabled:opacity-30" disabled={l.quantity <= 1} onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Diminuer la quantité"><Minus size={14} /></button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                        <button className="p-2 disabled:opacity-30" disabled={l.quantity >= l.stock} onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Augmenter la quantité"><Plus size={14} /></button>
                      </div>
                      <p className="text-right text-sm font-bold text-emerald-800">{formatPrice(l.price * l.quantity)}</p>
                    </div>
                    {l.stock <= 5 && <p className="mt-1.5 text-xs font-medium text-amber-700">Plus que {l.stock} en stock</p>}
                  </div>
                  <button onClick={() => remove(l.key)} aria-label={`Retirer ${l.name}`} className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-ink/60 hover:text-clay"><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
            <Suggestions />
            <div className="rounded-2xl bg-white shadow-sm">
              {couponCode || promoOpen ? (
                <div className="p-4"><CouponBox /></div>
              ) : (
                <button type="button" onClick={() => setPromoOpen(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-brass-dark"><Tag size={18} /> J’ai un code promo <ChevronDown size={16} className="ml-auto" /></button>
              )}
            </div>
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <Totals quote={quote} loading={loading} />
            </div>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-ink/60">
              <span className="flex items-center gap-1.5"><Banknote size={15} /> Paiement à la livraison</span>
              <span className="flex items-center gap-1.5"><RefreshCcw size={14} /> Échange sous 7 jours</span>
            </p>
            </div>
            <div className="shrink-0 border-t border-ink/10 bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Link href="/checkout" onClick={close} aria-disabled={!!error} className={`btn-primary w-full !justify-between !px-6 !py-4 !text-base ${error ? "pointer-events-none opacity-50" : ""}`}>
                <span className="flex items-center gap-1">Commander <ChevronRight size={18} /></span>
                <span className="tabular-nums">{formatPrice(quote?.total ?? cartSubtotal(lines))}</span>
              </Link>
              <button onClick={close} className="mt-2 block w-full py-2 text-center text-sm font-semibold text-brass-dark">Continuer mes achats</button>
            </div>
          </>
  );
}

/** « Complétez votre commande » : produits similaires au dernier article ajouté, hors ceux déjà dans le panier. */
function Suggestions() {
  const lines = useCart((s) => s.lines);
  const similar = useSimilar(lines[lines.length - 1]?.slug);
  const quickAdd = useQuickAddSimilar();
  const quickAddVariant = useQuickAddVariant();
  const [picking, setPicking] = useState<string | null>(null);
  const inCart = new Set(lines.map((l) => l.productId));
  const list = (similar ?? []).filter((p) => !inCart.has(p._id)).slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section className="rounded-2xl border border-brass/25 bg-sand-100/70 p-4" aria-label="Produits similaires">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brass-dark"><ShoppingBag size={14} /> Complétez votre commande</h3>
      <ul className="divide-y divide-brass/20">
        {list.map((p) => (
          <li key={p._id} className="flex flex-wrap items-center gap-3 py-3">
            <Link href={`/products/${p.slug}`} onClick={() => useCartDrawer.getState().set(false)} className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-white"><ProductImage src={p.image ?? undefined} alt={p.name} sizes="56px" /></Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${p.slug}`} onClick={() => useCartDrawer.getState().set(false)} className="line-clamp-2 text-sm font-semibold">{p.name}</Link>
              <p className="mt-0.5 text-sm font-bold text-emerald-800">{formatPrice(p.currentPrice)}</p>
            </div>
            {canPickInline(p) ? (
              <button type="button" onClick={() => setPicking(picking === p._id ? null : p._id)} aria-expanded={picking === p._id} className="flex shrink-0 items-center gap-1 rounded-full border border-ink/40 bg-white px-3.5 py-2 text-sm font-semibold">Choisir <ChevronDown size={14} className={`transition ${picking === p._id ? "rotate-180" : ""}`} /></button>
            ) : p.hasVariants ? (
              <Link href={`/products/${p.slug}`} onClick={() => useCartDrawer.getState().set(false)} className="flex shrink-0 items-center gap-1 rounded-full border border-ink/40 bg-white px-3.5 py-2 text-sm font-semibold">Choisir <ChevronDown size={14} /></Link>
            ) : (
              <button type="button" onClick={() => quickAdd(p)} aria-label={`Ajouter au panier : ${p.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sand-50 active:scale-95"><Plus size={18} /></button>
            )}
            {picking === p._id && canPickInline(p) && (
              <VariantPicker className="basis-full" variants={p.variants} onClose={() => setPicking(null)} onPick={(v) => { quickAddVariant(p, v); setPicking(null); }} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
