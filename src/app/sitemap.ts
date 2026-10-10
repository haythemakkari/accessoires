import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { mediaUrl } from "@/lib/media";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/products", priority: 0.9, changeFrequency: "daily" },
  { path: "/promotions", priority: 0.8, changeFrequency: "daily" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/service-client/faq", priority: 0.4, changeFrequency: "monthly" },
  { path: "/service-client/livraison", priority: 0.4, changeFrequency: "monthly" },
  { path: "/service-client/retours-echanges", priority: 0.4, changeFrequency: "monthly" },
  { path: "/confidentialite", priority: 0.2, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: absoluteUrl(s.path), lastModified: now, changeFrequency: s.changeFrequency, priority: s.priority }));
  try {
    await connectDB();
    const [products, cats] = await Promise.all([
      Product.find({ isActive: true }).select("slug updatedAt images category gender").sort({ updatedAt: -1 }).limit(50000).lean(),
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);
    const catById = new Map(cats.map((c) => [String(c._id), c]));

    // Listes « genre » et « catégorie × genre » qui contiennent réellement des produits (les produits unisexes comptent des deux côtés)
    const hasGender = new Set<string>();
    const hasCat = new Set<string>();
    const hasCatGender = new Set<string>();
    const latest = new Map<string, Date>();
    for (const p of products) {
      const c = catById.get(String(p.category));
      if (!c) continue;
      const genders = p.gender === "unisex" ? ["femme", "homme"] : [p.gender];
      hasCat.add(c.slug);
      for (const g of genders) { hasGender.add(g); hasCatGender.add(`${g}|${c.slug}`); }
      const k = c.slug; if (!latest.get(k) || p.updatedAt > latest.get(k)!) latest.set(k, p.updatedAt);
    }
    const lists: MetadataRoute.Sitemap = [
      ...[...hasGender].map((g) => ({ url: absoluteUrl(`/products?gender=${g}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
      ...[...hasCat].map((c) => ({ url: absoluteUrl(`/products?category=${c}`), lastModified: latest.get(c) ?? now, changeFrequency: "daily" as const, priority: 0.7 })),
      ...[...hasCatGender].map((k) => { const [g, c] = k.split("|"); return { url: absoluteUrl(`/products?gender=${g}&category=${c}`), lastModified: latest.get(c) ?? now, changeFrequency: "daily" as const, priority: 0.7 }; }),
    ];
    const items: MetadataRoute.Sitemap = products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.slice(0, 5).map((i) => absoluteUrl(mediaUrl(i, 1200))), // sitemap d'images : meilleure présence dans Google Images
    }));
    return [...staticPages, ...lists, ...items];
  } catch {
    return staticPages;
  }
}
