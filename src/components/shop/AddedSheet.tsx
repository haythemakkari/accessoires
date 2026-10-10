"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, X } from "lucide-react";
import { cartCount, useCart } from "@/stores/cart";
import { useCartDrawer } from "@/stores/cartDrawer";
import { useAddedSheet, type AddedItem } from "@/stores/addedSheet";
import { canPickInline, useQuickAddSimilar, useQuickAddVariant, useSimilar, type Similar } from "@/lib/client/similar";
import { VariantPicker } from "./VariantPicker";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";

/** Feuille « Ajouté au panier » qui monte du bas : récapitulatif de l'article, accès au panier et produits similaires. */
export function AddedSheet() {
  const item = useAddedSheet((s) => s.item);
  const hide = useAddedSheet((s) => s.hide);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!item) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [item, hide]);

  if (!mounted || !item) return null;
  return createPortal(<Sheet key={item.productId + (item.variant ?? "") + (item.packagingName ?? "")} item={item} onClose={hide} />, document.body);
}

function Sheet({ item, onClose }: { item: AddedItem; onClose: () => void }) {
  const count = useCart((s) => cartCount(s.lines));
  const similar = useSimilar(item.slug);
  const quickAdd = useQuickAddSimilar({ silent: true });
  const quickAddVariant = useQuickAddVariant({ silent: true });
  const cartLines = useCart((s) => s.lines);
  // Choix d'option sur la carte : `picking` = carte ouverte ; `added` = produit → option ajoutée (la carte reste grisée « 37 ajoutée »).
  const [picking, setPicking] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, string>>({});

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Ajouté au panier">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/20" />
        <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white"><Check size={18} strokeWidth={3} /></span>
            <h2 className="text-xl font-semibold">Ajouté au panier</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 hover:bg-sand-100"><X size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-4 px-5 py-4">
            <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100"><ProductImage src={item.image} alt={item.name} sizes="96px" /></div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-ink/60">{[item.variant, item.packagingName && `Packaging ${item.packagingName}`, `Quantité ${item.quantity}`].filter(Boolean).join(" · ")}</p>
              <p className={`mt-3 text-xl font-bold ${item.oldPrice ? "text-clay" : "text-emerald-800"}`}>{formatPrice(item.price)}</p>
              {item.oldPrice && <p className="text-xs text-ink/60">au lieu de <span className="line-through">{formatPrice(item.oldPrice)}</span></p>}
            </div>
          </div>

          <div className="space-y-3 px-5 pb-5">
            <button onClick={() => { onClose(); useCartDrawer.getState().set(true); }} className="btn-primary w-full !py-4 !text-base">
              Voir le panier <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-ink">{count}</span>
            </button>
            <button onClick={onClose} className="btn-outline w-full !py-4 !text-base">Continuer mes achats</button>
          </div>

          {similar && similar.length > 0 && (
            <section className="border-t border-ink/10 py-5" aria-label="Produits similaires">
              <h3 className="px-5 text-lg font-semibold">Pour compléter votre commande</h3>
              <p className="px-5 text-sm text-ink/60">Des produits similaires</p>
              <ul className="mt-4 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {similar.map((p: Similar) => {
                  const sale = p.isOnSale && p.salePrice != null && p.salePrice < p.price;
                  // Déjà ajouté depuis cette liste : la carte est grisée avec « Ajoutée » (les produits à options passent par leur fiche).
                  const addedOption = added[p._id];
                  const done = !!addedOption || (!p.hasVariants && cartLines.some((l) => l.productId === p._id));
                  return (
                    <li key={p._id} className="relative w-40 shrink-0">
                      <div className={`transition-opacity duration-300 ${done ? "pointer-events-none opacity-40" : ""}`} aria-hidden={done || undefined}>
                        <Link href={`/products/${p.slug}`} onClick={onClose} tabIndex={done ? -1 : undefined} className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-sand-100">
                          <ProductImage src={p.image ?? undefined} alt={p.name} sizes="160px" />
                          {sale && <span className="absolute left-2 top-2 rounded-full bg-clay px-2 py-0.5 text-xs font-semibold text-white">-{Math.round((1 - p.salePrice! / p.price) * 100)}%</span>}
                        </Link>
                        <Link href={`/products/${p.slug}`} onClick={onClose} tabIndex={done ? -1 : undefined} className="mt-2 line-clamp-2 block text-sm">{p.name}</Link>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="leading-tight">
                            <p className={`text-sm font-bold ${sale ? "text-clay" : ""}`}>{formatPrice(p.currentPrice)}</p>
                            {sale && <p className="text-xs text-ink/50 line-through">{formatPrice(p.price)}</p>}
                          </div>
                          {canPickInline(p) ? (
                            <button type="button" disabled={done} onClick={(e) => { const li = e.currentTarget.closest("li"); setPicking(picking === p._id ? null : p._id); requestAnimationFrame(() => li?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })); }} aria-expanded={picking === p._id} aria-label={`Choisir l'option : ${p.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sand-50 active:scale-95"><Plus size={18} /></button>
                          ) : p.hasVariants ? (
                            <Link href={`/products/${p.slug}`} onClick={onClose} aria-label={`Choisir les options : ${p.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sand-50"><Plus size={18} /></Link>
                          ) : (
                            <button type="button" disabled={done} onClick={() => quickAdd(p)} aria-label={`Ajouter au panier : ${p.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sand-50 active:scale-95"><Plus size={18} /></button>
                          )}
                        </div>
                      </div>
                      {done && <p role="status" className="pointer-events-none absolute inset-x-0 top-[38%] flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-800"><Check size={16} strokeWidth={3} /> {addedOption ? `${addedOption} ajoutée` : "Ajoutée"}</p>}
                      {picking === p._id && !done && canPickInline(p) && (
                        <VariantPicker className="absolute inset-x-0 bottom-0 z-10" variants={p.variants} onClose={() => setPicking(null)}
                          onPick={(v) => { if (quickAddVariant(p, v)) setAdded((a) => ({ ...a, [p._id]: v })); setPicking(null); }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
