/** Fusion de deux paniers (celui du navigateur et celui du compte). Fichier pur : navigateur + serveur. */
import { cartKey } from "./packaging";

export type CartRef = { productId: string; quantity: number; variant?: string; packagingId?: string };

const MAX_LINES = 50;
const MAX_QTY = 50;
export const refKey = (r: Pick<CartRef, "productId" | "variant" | "packagingId">) => cartKey(r.productId, r.variant, r.packagingId);

/**
 * Même article des deux côtés → on garde la PLUS GRANDE quantité (jamais la somme : si le panier a déjà été synchronisé,
 * additionner doublerait les quantités à chaque connexion). Les articles propres à un seul côté sont conservés.
 */
export function mergeCartRefs(local: CartRef[], server: CartRef[]): CartRef[] {
  const out = new Map<string, CartRef>();
  for (const r of [...local, ...server]) {
    const k = refKey(r);
    const prev = out.get(k);
    out.set(k, prev ? { ...prev, quantity: Math.min(MAX_QTY, Math.max(prev.quantity, r.quantity)) } : { ...r, quantity: Math.min(MAX_QTY, r.quantity) });
  }
  return [...out.values()].slice(0, MAX_LINES);
}
