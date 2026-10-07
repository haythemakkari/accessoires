import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { env } from "@/lib/env";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf7f2" };

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  applicationName: env.siteName,
  title: { default: `${env.siteName} — Bijoux, montres, sacs & accessoires de mode`, template: `%s | ${env.siteName}` },
  description: SITE_DESCRIPTION,
  // Canonique « relatif » : chaque page se déclare elle-même comme version de référence (sans paramètres d'URL). Les listes filtrées la surchargent.
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: env.siteName, locale: "fr_FR", title: `${env.siteName} — L’élégance en détail`, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
  category: "shopping",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Lien d'évitement : permet aux utilisateurs du clavier / lecteurs d'écran de sauter l'en-tête */}
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-sand-50">Aller au contenu</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
