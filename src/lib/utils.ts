import clsx, { type ClassValue } from "clsx";
import slugify from "slugify";

import type { SaleFields } from "./sale";
import { isSaleActive, saleStatus } from "./sale";

export const cn = (...i: ClassValue[]) => clsx(i);
export const toSlug = (s: string) => slugify(s, { lower: true, strict: true, locale: "fr" });
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function formatPrice(n: number, currency = process.env.NEXT_PUBLIC_CURRENCY ?? "DT") {
  return `${n.toFixed(2).replace(".", ",")} ${currency}`;
}
export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

/** Date et heure en heure de Tunisie (même rendu sur le serveur et dans le navigateur) : « 12 oct. 2026 · 10:24 ». */
export const formatDateTime = (d: string | Date) => {
  const x = new Date(d);
  const date = x.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Tunis" });
  const time = x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" });
  return `${date} · ${time}`;
};

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

/** Prix effectif : le prix promo s'applique seulement si la promo est active MAINTENANT (début/fin compris) et réellement inférieure. */
export const effectivePrice = (p: SaleFields, now?: number) => (isSaleActive(p, now) ? (p.salePrice as number) : p.price);
/**
 * Ajoute `currentPrice` et l'état de la promotion. `isOnSale` devient « promo en cours » (une promo programmée ou terminée n'est pas affichée comme telle) ;
 * `saleEnabled` garde l'interrupteur de l'admin et `saleStatus` l'état (none / scheduled / active / ended).
 */
export const withPrice = <T extends SaleFields>(p: T) => {
  const status = saleStatus(p);
  return { ...p, currentPrice: effectivePrice(p), isOnSale: status === "active", saleEnabled: !!p.isOnSale, saleStatus: status };
};

/** Sérialise un document Mongoose en JSON pur (ids en string). */
export const plain = <T>(doc: T): T => JSON.parse(JSON.stringify(doc));
