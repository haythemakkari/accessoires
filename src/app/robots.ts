import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/media/"], // les images produit doivent rester explorables (Google Images)
        disallow: [
          "/admin", "/api/", "/account", "/cart", "/checkout", "/login", "/register",
          // listes triées / filtrées / recherche : pages quasi identiques, inutiles à explorer (budget de crawl)
          "/*?*sort=", "/*?*q=", "/*?*minPrice=", "/*?*maxPrice=", "/*?*inStock=", "/*?*onSale=", "/*?*featured=",
        ],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}
