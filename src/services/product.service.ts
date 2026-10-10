import { randomBytes } from "crypto";
import type { QueryFilter } from "mongoose";
import { z } from "zod";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { productListQuery } from "@/validation/schemas";
import { escapeRegex, plain, withPrice } from "@/lib/utils";
import { publicProduct } from "@/lib/packaging";

type Query = z.infer<typeof productListQuery>;

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
  if (q.onSale === "true") filter.isOnSale = true;
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
