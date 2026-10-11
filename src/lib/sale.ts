/** Promotions programmées : un prix promo peut avoir une date/heure de début et de fin. Fichier pur : navigateur + serveur. */
export type SaleFields = {
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
};

/** none : pas de promo · scheduled : commence plus tard · active : en cours · ended : terminée. */
export type SaleStatus = "none" | "scheduled" | "active" | "ended";

const ts = (d?: Date | string | null) => (d ? new Date(d).getTime() : null);

export function saleStatus(p: SaleFields, now: number = Date.now()): SaleStatus {
  if (!p.isOnSale || p.salePrice == null || !(p.salePrice < p.price)) return "none";
  const start = ts(p.saleStartsAt);
  const end = ts(p.saleEndsAt);
  if (start != null && now < start) return "scheduled";
  if (end != null && now >= end) return "ended";
  return "active";
}

/** Le prix promo s'applique à cet instant (et seulement à cet instant). */
export const isSaleActive = (p: SaleFields, now?: number) => saleStatus(p, now) === "active";
