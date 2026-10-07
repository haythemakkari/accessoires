import { formatPrice } from "@/lib/utils";
import type { Quote } from "@/lib/client/useQuote";

export function Totals({ quote, loading }: { quote: Quote | null; loading?: boolean }) {
  if (!quote) return <p className="text-sm text-ink/60">{loading ? "Calcul en cours…" : "—"}</p>;
  return (
    <dl className={`space-y-2 text-sm transition ${loading ? "opacity-50" : ""}`}>
      <div className="flex justify-between"><dt className="text-ink/60">Sous-total</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Réduction</dt><dd>-{formatPrice(quote.discount)}</dd></div>}
      <div className="flex justify-between"><dt className="text-ink/60">Livraison</dt><dd>{quote.shippingFee === 0 ? "Offerte" : formatPrice(quote.shippingFee)}</dd></div>
      <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(quote.total)}</dd></div>
    </dl>
  );
}
