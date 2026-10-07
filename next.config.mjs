/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

if (process.env.NODE_ENV === "production") securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });

/** Pages publiques : le CDN peut garder le HTML 60 s (puis le servir périmé pendant 5 min le temps de le régénérer). Aucune donnée propre à un visiteur n'y figure. */
const PUBLIC_HTML_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
/** Logos / icônes versionnés par ?v=N (src/lib/assets.ts) : cache 1 an. */
const STATIC_ASSET_CACHE = "public, max-age=31536000, immutable";

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  // Les balises <title>/<meta> doivent figurer dans le <head> du HTML initial pour TOUS les robots (Facebook, WhatsApp, LinkedIn, Lighthouse…),
  // pas être « streamées » plus tard dans la page.
  htmlLimitedBots: /.*/,
  experimental: { inlineCss: true, browsersListForSwc: true }, // browsersListForSwc : le code est compilé pour les navigateurs récents (package.json → browserslist) : moins de polyfills // CSS critique inséré dans le HTML : plus de feuille de style bloquant le premier affichage
  // Les anciens liens /uploads/xxx passent par la route /media (redimensionnement + cache) : jamais l'original lourd.
  async redirects() {
    return [
      { source: "/account/security", destination: "/account/profile#mot-de-passe", permanent: false },
      { source: "/account/coupons", destination: "/account", permanent: false },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/uploads/:name", destination: "/media/:name" }] };
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/((?!api|admin|account|cart|checkout|login|register|_next|media|uploads).*)", headers: [{ key: "Cache-Control", value: PUBLIC_HTML_CACHE }] },
      { source: "/:file(logo.*\\.webp|icon.*\\.png|apple-icon.*\\.png|favicon.ico)", headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }] },
    ];
  },
};
export default nextConfig;
