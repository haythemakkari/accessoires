"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart";
import { fetcher } from "./fetcher";

export type Quote = { subtotal: number; discount: number; shippingFee: number; /** Box cadeau facturée (0 si non choisie). */ giftBoxFee?: number; total: number; /** Le coupon appliqué exclut les produits en promotion. */ excludesSale?: boolean };

/** Le total affiché vient toujours du serveur (prix, stock, coupon, livraison recalculés). */
export function useQuote() {
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const giftBox = useCart((s) => s.giftBox);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sig = JSON.stringify([lines.map((l) => [l.productId, l.quantity, l.variant, l.packagingId]), couponCode, giftBox]);

  useEffect(() => {
    if (lines.length === 0) { setQuote(null); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await fetcher<Quote>("/api/cart/quote", {
          method: "POST",
          body: { items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variant: l.variant, packagingId: l.packagingId })), couponCode: couponCode ?? undefined, giftBox },
        });
        if (!cancelled) { setQuote(q); setError(null); }
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setQuote(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { quote, error, loading };
}
