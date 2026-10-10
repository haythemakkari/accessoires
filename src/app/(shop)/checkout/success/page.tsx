"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartLine } from "@/stores/cart";
import type { Quote } from "@/lib/client/useQuote";

type Snapshot = { orderNumber: string; lines: CartLine[]; quote: Quote; customer: { fullName: string; phone: string; line: string; city: string; district?: string } };

export default function SuccessPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [number, setNumber] = useState("");
  useEffect(() => {
    setNumber(new URLSearchParams(location.search).get("order") ?? "");
    try {
      const s = JSON.parse(sessionStorage.getItem("accessoires-plus-last-order") ?? "null");
      if (s) setSnap(s);
    } catch {}
  }, []);

  return (
    <div className="container-x max-w-2xl py-16 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={56} strokeWidth={1.5} />
      <h1 className="h-display mt-4 text-4xl">Merci pour votre commande !</h1>
      <p className="mt-3 text-ink/65">Numéro de commande</p>
      <p className="mt-1 font-mono text-xl font-semibold tracking-wider">{number || snap?.orderNumber}</p>
      {snap && (
        <div className="card mt-8 p-6 text-left text-sm">
          <ul className="divide-y divide-ink/10">
            {snap.lines.map((l) => <li key={l.key} className="flex justify-between py-2"><span>{l.quantity} × {l.name}{l.variant && ` (${l.variant})`}{l.packagingName && ` · ${l.packagingName}`}</span><span>{formatPrice(l.price * l.quantity)}</span></li>)}
          </ul>
          <div className="mt-3 space-y-1 border-t border-ink/10 pt-3">
            {snap.quote.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction</span><span>-{formatPrice(snap.quote.discount)}</span></div>}
            <div className="flex justify-between"><span>Livraison</span><span>{snap.quote.shippingFee ? formatPrice(snap.quote.shippingFee) : "Offerte"}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total à payer à la livraison</span><span>{formatPrice(snap.quote.total)}</span></div>
          </div>
          <p className="mt-4 text-ink/60">Livraison à : {snap.customer.line}, {[snap.customer.district?.trim(), snap.customer.city].filter(Boolean).join(", ")}</p>
        </div>
      )}
      <div className="mt-6 rounded-xl bg-sand-100 p-4 text-sm text-ink/70">Nous vous appellerons au numéro indiqué pour confirmer la livraison. Conservez votre numéro de commande.</div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-primary">Continuer mes achats</Link>
        <Link href="/account/orders" className="btn-outline">Mes commandes</Link>
      </div>
    </div>
  );
}
