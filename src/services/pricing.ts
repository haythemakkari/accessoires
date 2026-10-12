import { round2 } from "@/lib/utils";
import { AppError } from "@/lib/errors";
import type { SettingsData } from "@/models/Settings";

export function computeDiscount(coupon: { type: "percentage" | "fixed"; value: number } | null, subtotal: number) {
  if (!coupon) return 0;
  const raw = coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

/**
 * Réduction d'un coupon sur un panier. Si le coupon exclut les produits en promotion, la réduction se calcule
 * UNIQUEMENT sur la part du panier hors promotion (pourcentage de cette part ; montant fixe plafonné à cette part).
 * Un panier entièrement en promotion n'a donc aucune réduction possible : le code est refusé avec un message clair.
 */
export function couponDiscount(coupon: { type: "percentage" | "fixed"; value: number; appliesToSaleItems?: boolean | null; kind?: string | null }, subtotal: number, saleSubtotal: number) {
  // Les codes de bienvenue ne s'appliquent jamais aux produits en promotion (même ceux émis avant cette règle).
  const excludesSale = coupon.appliesToSaleItems === false || coupon.kind === "welcome";
  const base = excludesSale ? round2(subtotal - saleSubtotal) : subtotal;
  if (excludesSale && base <= 0) throw new AppError("Ce code ne s'applique pas aux produits en promotion", 422, "COUPON_SALE_ONLY");
  return { discount: computeDiscount(coupon, base), excludesSale, base };
}

export function computeShipping(subtotalAfterDiscount: number, s: SettingsData) {
  if (s.freeShippingThreshold > 0 && subtotalAfterDiscount >= s.freeShippingThreshold) return 0;
  return s.shippingFee;
}

export function computeTotals(subtotal: number, discount: number, settings: SettingsData) {
  const shippingFee = computeShipping(subtotal - discount, settings);
  return { subtotal: round2(subtotal), discount, shippingFee, total: round2(subtotal - discount + shippingFee) };
}
