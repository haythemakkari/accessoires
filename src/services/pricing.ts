import { round2 } from "@/lib/utils";
import type { SettingsData } from "@/models/Settings";

export function computeDiscount(coupon: { type: "percentage" | "fixed"; value: number } | null, subtotal: number) {
  if (!coupon) return 0;
  const raw = coupon.type === "percentage" ? (subtotal * coupon.value) / 100 : coupon.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

export function computeShipping(subtotalAfterDiscount: number, s: SettingsData) {
  if (s.freeShippingThreshold > 0 && subtotalAfterDiscount >= s.freeShippingThreshold) return 0;
  return s.shippingFee;
}

export function computeTotals(subtotal: number, discount: number, settings: SettingsData) {
  const shippingFee = computeShipping(subtotal - discount, settings);
  return { subtotal: round2(subtotal), discount, shippingFee, total: round2(subtotal - discount + shippingFee) };
}
