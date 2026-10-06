import clsx, { type ClassValue } from "clsx";
import slugify from "slugify";

export const cn = (...i: ClassValue[]) => clsx(i);
export const toSlug = (s: string) => slugify(s, { lower: true, strict: true, locale: "fr" });
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function formatPrice(n: number, currency = process.env.NEXT_PUBLIC_CURRENCY ?? "DT") {
  return `${n.toFixed(2).replace(".", ",")} ${currency}`;
}
export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

/** Normalise un email pour détecter les doublons (gmail: points et +alias ignorés). */
export function normalizeEmail(email: string) {
  const [rawLocal, domain] = email.trim().toLowerCase().split("@");
  if (!domain) return email.trim().toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${rawLocal.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${rawLocal.split("+")[0]}@${domain}`;
}
export const normalizePhone = (p: string) => p.replace(/[\s.\-()]/g, "");

/** Prix effectif : le prix promo s'applique seulement si la promo est active et réellement inférieure. */
export const effectivePrice = (p: { price: number; salePrice?: number | null; isOnSale?: boolean | null }) =>
  p.isOnSale && p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
export const withPrice = <T extends { price: number; salePrice?: number | null; isOnSale?: boolean | null }>(p: T) => ({ ...p, currentPrice: effectivePrice(p) });

/** Sérialise un document Mongoose en JSON pur (ids en string). */
export const plain = <T>(doc: T): T => JSON.parse(JSON.stringify(doc));
