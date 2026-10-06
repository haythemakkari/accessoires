"use client";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart";
import { useQuote } from "@/lib/client/useQuote";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import { CouponBox } from "@/components/shop/CouponBox";
import { Totals } from "@/components/shop/Totals";

export default function CartPage() {
  const { lines, setQty, remove, clear } = useCart();
  const { quote, error, loading } = useQuote();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="container-x py-20" />;
  if (lines.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="h-display text-4xl">Votre panier est vide</h1>
        <p className="mt-3 text-ink/60">Découvrez notre sélection d’accessoires.</p>
        <Link href="/products" className="btn-primary mt-8">Parcourir la boutique</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="h-display text-4xl">Panier</h1>
        <button onClick={clear} className="text-sm text-ink/55 underline underline-offset-4 hover:text-clay">Vider le panier</button>
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-ink/10">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-4 py-5">
              <Link href={`/products/${l.slug}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100"><ProductImage src={l.image} alt={l.name} /></Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/products/${l.slug}`} className="font-medium hover:text-brass-dark">{l.name}</Link>
                    {l.variant && <p className="text-sm text-ink/55">{l.variant}</p>}
                    <p className="mt-1 text-sm text-ink/55">{formatPrice(l.price)} / unité</p>
                  </div>
                  <p className="font-semibold">{formatPrice(l.price * l.quantity)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-ink/20">
                    <button className="p-2.5 disabled:opacity-30" disabled={l.quantity <= 1} onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Diminuer"><Minus size={14} /></button>
                    <span className="w-7 text-center text-sm tabular-nums">{l.quantity}</span>
                    <button className="p-2.5 disabled:opacity-30" disabled={l.quantity >= l.stock} onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Augmenter"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => remove(l.key)} className="p-2 text-ink/45 hover:text-clay" aria-label="Supprimer"><Trash2 size={18} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28">
          <h2 className="h-display text-xl">Récapitulatif</h2>
          <CouponBox />
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <Totals quote={quote} loading={loading} />
          <Link href="/checkout" aria-disabled={!!error} className={`btn-primary w-full ${error ? "pointer-events-none opacity-50" : ""}`}>Passer la commande</Link>
          <p className="text-center text-xs text-ink/45">Commande possible sans compte · Paiement à la livraison</p>
        </aside>
      </div>
    </div>
  );
}
