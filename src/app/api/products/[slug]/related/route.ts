import { api } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { plain, withPrice } from "@/lib/utils";
import { Product } from "@/models/Product";

type Ctx = { params: Promise<{ slug: string }> };
const LIMIT = 8;

/** Produits similaires : même catégorie d'abord (les plus vendus), complétés par le même rayon (genre). Format léger pour le panneau « Ajouté au panier ». */
export const GET = api<Ctx>(async (_req, { params }) => {
  const { slug } = await params;
  const p = await Product.findOne({ slug, isActive: true }).select("category gender").lean();
  if (!p) throw notFound("Produit introuvable");
  const base = { isActive: true, stock: { $gt: 0 }, _id: { $ne: p._id } };
  const same = await Product.find({ ...base, category: p.category }).sort({ soldCount: -1 }).limit(LIMIT).lean();
  let list = same;
  if (list.length < LIMIT) {
    const more = await Product.find({ ...base, gender: p.gender, _id: { $nin: [p._id, ...same.map((x) => x._id)] } }).sort({ soldCount: -1 }).limit(LIMIT - list.length).lean();
    list = [...same, ...more];
  }
  const items = list.map((x) => {
    const d = withPrice(plain(x)) as unknown as { _id: string; name: string; slug: string; images: string[]; price: number; salePrice?: number; isOnSale: boolean; compareAtPrice?: number; currentPrice: number; stock: number; variants: unknown[] };
    return { _id: d._id, name: d.name, slug: d.slug, image: d.images[0] ?? null, price: d.price, salePrice: d.salePrice ?? null, isOnSale: d.isOnSale, compareAtPrice: d.compareAtPrice ?? null, currentPrice: d.currentPrice, stock: d.stock, hasVariants: d.variants.length > 0 };
  });
  return { items };
});
