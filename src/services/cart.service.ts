import { Types } from "mongoose";
import { Cart } from "@/models/Cart";
import { Product } from "@/models/Product";
import { effectivePrice } from "@/lib/utils";
import { imageForVariantString } from "@/lib/variants";
import type { CartRef } from "@/lib/cart-merge";
import { finalUnitPrice } from "@/lib/packaging";

export type HydratedLine =
  | { state: "ok" | "adjusted"; productId: string; variant?: string; packagingId?: string; packagingName?: string; packagingPrice?: number; quantity: number; requested: number; name: string; slug: string; image?: string; price: number; stock: number }
  | { state: "unavailable"; productId: string; variant?: string; packagingId?: string; reason: "missing" | "variant" | "soldout" | "packaging" };

/**
 * Remet à jour des lignes de panier avec l'état ACTUEL du catalogue : prix, stock, photo de la couleur choisie.
 * Produit supprimé / désactivé, option retirée, rupture → « unavailable » ; stock insuffisant → quantité ramenée au stock (« adjusted »).
 */
export async function hydrateCart(items: CartRef[]): Promise<HydratedLine[]> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  // Le stock est partagé entre les variantes d'un même produit : on le répartit dans l'ordre des lignes.
  const remaining = new Map(products.map((p) => [String(p._id), p.stock]));
  return items.map((it): HydratedLine => {
    const p = byId.get(it.productId);
    if (!p) return { state: "unavailable", productId: it.productId, variant: it.variant, packagingId: it.packagingId, reason: "missing" };
    if (p.variants.length > 0) {
      const chosen = (it.variant ?? "").split(" / ");
      const ok = p.variants.length === chosen.length && p.variants.every((v, i) => v.options.includes(chosen[i]));
      if (!ok) return { state: "unavailable", productId: it.productId, variant: it.variant, packagingId: it.packagingId, reason: "variant" };
    }
    // Packaging retiré, désactivé ou indisponible depuis l'ajout : la ligne n'est plus valable.
    const opt = it.packagingId ? (p.packagingEnabled ? p.packagings.find((o) => String(o._id) === it.packagingId) : undefined) : undefined;
    if (it.packagingId && (!opt || !opt.isAvailable)) return { state: "unavailable", productId: it.productId, variant: it.variant, packagingId: it.packagingId, reason: "packaging" };
    const left = remaining.get(it.productId) ?? 0;
    if (left <= 0) return { state: "unavailable", productId: it.productId, variant: it.variant, packagingId: it.packagingId, reason: "soldout" };
    const quantity = Math.min(it.quantity, left);
    remaining.set(it.productId, left - quantity);
    return {
      state: quantity < it.quantity ? "adjusted" : "ok",
      productId: it.productId,
      variant: it.variant,
      packagingId: opt ? String(opt._id) : undefined,
      packagingName: opt?.name,
      packagingPrice: opt?.price,
      quantity,
      requested: it.quantity,
      name: p.name,
      slug: p.slug,
      image: imageForVariantString(p.variants, it.variant) ?? p.images[0],
      price: finalUnitPrice(effectivePrice(p), opt?.price),
      stock: p.stock,
    };
  });
}

export async function loadStoredCart(userId: string) {
  const c = await Cart.findOne({ user: userId }).lean();
  return { items: (c?.items ?? []).map((i) => ({ productId: String(i.product), quantity: i.quantity, variant: i.variant || undefined, packagingId: i.packaging || undefined })), couponCode: c?.couponCode ?? null };
}

/** Enregistre le panier du compte (remplace l'existant). Panier vide → document supprimé. */
export async function saveStoredCart(userId: string, items: CartRef[], couponCode?: string | null) {
  if (items.length === 0) {
    await Cart.deleteOne({ user: userId });
    return;
  }
  await Cart.updateOne(
    { user: userId },
    { $set: { items: items.map((i) => ({ product: new Types.ObjectId(i.productId), quantity: i.quantity, variant: i.variant, packaging: i.packagingId })), couponCode: couponCode || undefined } },
    { upsert: true },
  );
}

export const clearStoredCart = (userId: string) => Cart.deleteOne({ user: userId });
