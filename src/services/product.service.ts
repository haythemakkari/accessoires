import { randomBytes } from "crypto";
import type { QueryFilter } from "mongoose";
import { z } from "zod";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { productListQuery } from "@/validation/schemas";
import { escapeRegex, plain, withPrice } from "@/lib/utils";
import { publicProduct } from "@/lib/packaging";

type Query = z.infer<typeof productListQuery>;

/** Promo valide ET en cours à l'instant `now` : interrupteur actif, prix promo inférieur au prix, début passé (ou sans début), fin à venir (ou sans fin). */
const SALE_PRICE_OK = { $expr: { $and: [{ $in: [{ $type: "$salePrice" }, ["double", "int", "long", "decimal"]] }, { $lt: ["$salePrice", "$price"] }] } };
export const activeSaleClause = (now = new Date()) => ({
  isOnSale: true as const,
  ...SALE_PRICE_OK,
  $and: [{ $or: [{ saleStartsAt: null }, { saleStartsAt: { $lte: now } }] }, { $or: [{ saleEndsAt: null }, { saleEndsAt: { $gt: now } }] }] as QueryFilter<any>[],
});

export async function listProducts(q: Query, opts: { includeInactive?: boolean } = {}) {
  const filter: QueryFilter<any> = {};
  if (!opts.includeInactive) filter.isActive = true;

  if (q.q) {
    // Recherche partielle insensible à la casse (« mont » trouve « Montre »). Chaque mot doit apparaître dans le nom, le SKU ou la description.
    // $text est évité : incompatible avec la saisie partielle et le stemming anglais dégrade le français.
    filter.$and = q.q.split(/\s+/).filter(Boolean).slice(0, 5).map((w) => {
      const rx = new RegExp(escapeRegex(w), "i");
      return { $or: [{ name: rx }, { sku: rx }, { description: rx }] };
    });
  }
  if (q.category) {
    const cat = await Category.findOne({ slug: q.category, isActive: true }).select("_id").lean();
    filter.category = cat?._id ?? null;
  }
  if (q.gender) filter.gender = q.gender === "unisex" ? "unisex" : { $in: [q.gender, "unisex"] };
  if (q.minPrice != null || q.maxPrice != null) {
    const range: Record<string, number> = {};
    if (q.minPrice != null) range.$gte = q.minPrice;
    if (q.maxPrice != null) range.$lte = q.maxPrice;
    filter.price = range;
  }
  if (q.inStock === "true") filter.stock = { $gt: 0 };
  if (q.onSale === "true") {
    // Seules les promos EN COURS (pas celles programmées plus tard, ni terminées). `$and` est partagé avec la recherche : on ajoute sans l'écraser.
    const { $and, ...rest } = activeSaleClause();
    Object.assign(filter, rest);
    filter.$and = [...((filter.$and as QueryFilter<any>[] | undefined) ?? []), ...$and];
  }
  if (q.featured === "true") filter.isFeatured = true;

  const sorts: Record<Query["sort"], Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    price_asc: { price: 1, _id: 1 },
    price_desc: { price: -1, _id: -1 },
    popular: { soldCount: -1, createdAt: -1, _id: -1 },
  };
  const sort = sorts[q.sort];

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).populate("category", "name slug").lean(),
    Product.countDocuments(filter),
  ]);
  return { items: plain(items).map((p) => (opts.includeInactive ? withPrice(p) : publicProduct(withPrice(p)))), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
}

/** SKU automatique « AP-XXXXXX », unique. Utilisé quand l'admin laisse le champ vide. */
export async function generateSku() {
  for (let i = 0; i < 10; i++) {
    const sku = `AP-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!(await Product.exists({ sku }))) return sku;
  }
  throw new Error("Impossible de générer un SKU unique");
}

export async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || "produit";
  for (let i = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Promotions qui commencent plus tard (les plus proches d'abord) : affichées sur l'accueil avec un compte à rebours. */
export async function upcomingSales(limit = 4, now = new Date()) {
  const items = await Product.find({ isActive: true, isOnSale: true, saleStartsAt: { $gt: now }, ...SALE_PRICE_OK })
    .sort({ saleStartsAt: 1 }).limit(limit).populate("category", "name slug").lean();
  return plain(items).map((p) => publicProduct(withPrice(p)));
}
