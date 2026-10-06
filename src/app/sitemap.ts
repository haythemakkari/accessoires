import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages: MetadataRoute.Sitemap = ["", "/products", "/promotions"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily", priority: p ? 0.8 : 1 }));
  try {
    await connectDB();
    const [products, cats] = await Promise.all([
      Product.find({ isActive: true }).select("slug updatedAt").limit(50000).lean(),
      Category.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);
    return [
      ...staticPages,
      ...cats.map((c) => ({ url: `${base}/products?category=${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
      ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ];
  } catch {
    return staticPages;
  }
}
