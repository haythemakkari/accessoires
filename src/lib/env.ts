export const env = {
  get mongoUri() {
    const v = process.env.MONGODB_URI;
    if (!v) throw new Error("MONGODB_URI manquant");
    return v;
  },
  get jwtSecret() {
    const v = process.env.JWT_SECRET;
    if (!v || v.length < 32) throw new Error("JWT_SECRET manquant ou trop court (min 32 caractères)");
    return v;
  },
  shippingFee: Number(process.env.SHIPPING_FLAT_FEE ?? 7),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 150),
  maxSignupsPerIp: Number(process.env.MAX_SIGNUPS_PER_IP_PER_DAY ?? 3),
  // Sur Vercel, à défaut de NEXT_PUBLIC_SITE_URL, on prend le domaine de production du projet (…vercel.app ou domaine personnalisé).
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "Accessoires Plus",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "DT",
};

// Garde-fou : en production, une URL de site restée sur localhost fausserait canoniques, sitemap et données structurées.
if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(env.siteUrl) && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[SEO] NEXT_PUBLIC_SITE_URL pointe vers", env.siteUrl, "— définissez l'URL publique du site (https://…) pour des canoniques et un sitemap corrects.");
}
