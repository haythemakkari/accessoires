"use client";
import { Price } from "@/components/ui/Price";
import { formatPrice } from "@/lib/utils";
import { finalUnitPrice } from "@/lib/packaging";
import { useVariantChoice } from "./VariantContext";

/** Prix de la fiche produit : se met à jour immédiatement quand le client change de packaging (prix final = prix de base + supplément). */
export function ProductPrice({ price, salePrice, compareAt, onSale, currentPrice }: { price: number; salePrice?: number | null; compareAt?: number | null; onSale: boolean; currentPrice: number }) {
  const { packaging } = useVariantChoice();
  const s = packaging?.price ?? 0;
  const plus = (v?: number | null) => (v == null ? v : finalUnitPrice(v, s));
  return (
    <div>
      <Price size="lg" price={plus(price)!} salePrice={plus(salePrice)} compareAt={plus(compareAt)} onSale={onSale} />
      {packaging && (
        <dl className="mt-3 max-w-xs space-y-1 rounded-xl bg-sand-100 px-4 py-3 text-sm" aria-live="polite">
          <div className="flex justify-between gap-4"><dt className="text-ink/60">Prix du produit</dt><dd className="tabular-nums">{formatPrice(currentPrice)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink/60">Packaging · {packaging.name}</dt><dd className="tabular-nums">{s > 0 ? `+ ${formatPrice(s)}` : "Offert"}</dd></div>
          <div className="flex justify-between gap-4 border-t border-ink/10 pt-1 font-semibold"><dt>Prix final</dt><dd className="tabular-nums">{formatPrice(finalUnitPrice(currentPrice, s))}</dd></div>
        </dl>
      )}
    </div>
  );
}
