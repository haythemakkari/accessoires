import { publicProduct, type PackagingOption } from "@/lib/packaging";
import { unstable_cache, revalidateTag } from "next/cache";
import { connectDB } from "./db";
import { plain, withPrice } from "./utils";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { listProducts } from "@/services/product.service";
import { defaultSettings, getSettings } from "@/services/settings.service";
import { productListQuery } from "@/validation/schemas";

export type CategoryDTO = { _id: string; name: string; slug: string; description?: string; image?: string };
export type ProductDTO = {
  _id: string; name: string; slug: string; description: string; price: number; compareAtPrice?: number; salePrice?: number; isOnSale: boolean;
  currentPrice: number; gender: "homme" | "femme" | "unisex"; images: string[]; stock: number; sku: string; isActive: boolean; isFeatured: boolean;
  variants: { name: string; options: string[]; optionImages?: { option: string; image: string }[] }[]; packagingEnabled?: boolean; packagings?: PackagingOption[]; soldCount: number; category: { _id: string; name: string; slug: string } | null; createdAt: string; updatedAt: string;
};

const TAG = "catalog";

/**
 * Pendant `next build`, les pages d'accueil / information sont pré-générées et lisent la base. Si la base est injoignable à ce moment
 * (CI, Docker sans base…), on ne fait pas échouer le build : on pré-génère avec des valeurs par défaut ; ces pages sont régénérées
 * automatiquement dès la première minute en ligne (revalidation). En exécution normale, l'erreur est propagée comme avant.
 */
async function orBuildFallback<T>(load: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn("[build] base injoignable, valeurs par défaut utilisées pour la pré-génération :", (e as Error).message);
      return fallback();
    }
    throw e;
  }
}
/** À appeler après toute modification admin du catalogue. */
export const bustCatalog = () => revalidateTag(TAG);

export const getShopSettings = unstable_cache(
  () => orBuildFallback(async () => { await connectDB(); return getSettings(); }, defaultSettings),
  ["settings"],
  { revalidate: 120, tags: [TAG] },
);

export const getCategories = unstable_cache(
  async () => {
    await connectDB();
    return plain(await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()) as unknown as CategoryDTO[];
  },
  ["categories"],
  { revalidate: 120, tags: [TAG] },
);

export const getHomeData = unstable_cache(
  () =>
    orBuildFallback(
      async () => {
        await connectDB();
        const q = (o: object) => productListQuery.parse({ limit: 8, ...o });
        const [featured, latest, sale] = await Promise.all([
          listProducts(q({ featured: "true" })),
          listProducts(q({ sort: "newest" })),
          listProducts(q({ onSale: "true", limit: 4 })),
        ]);
        return {
          featured: featured.items as unknown as ProductDTO[],
          latest: latest.items as unknown as ProductDTO[],
          sale: sale.items as unknown as ProductDTO[],
        };
      },
      () => ({ featured: [] as ProductDTO[], latest: [] as ProductDTO[], sale: [] as ProductDTO[] }),
    ),
  ["home"],
  { revalidate: 60, tags: [TAG] },
);

export const getProductBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      await connectDB();
      const p = await Product.findOne({ slug, isActive: true }).populate("category", "name slug").lean();
      return p ? (publicProduct(withPrice(plain(p))) as unknown as ProductDTO) : null;
    },
    ["product", slug],
    { revalidate: 60, tags: [TAG] },
  )();

export const getRelated = (p: ProductDTO) =>
  unstable_cache(
    async () => {
      await connectDB();
      const items = await Product.find({ isActive: true, category: p.category?._id, _id: { $ne: p._id } }).sort({ soldCount: -1 }).limit(4).populate("category", "name slug").lean();
      return plain(items).map((x) => publicProduct(withPrice(x))) as unknown as ProductDTO[];
    },
    ["related", p._id],
    { revalidate: 120, tags: [TAG] },
  )();
