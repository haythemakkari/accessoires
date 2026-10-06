import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${env.siteName} — Accessoires de mode homme & femme`, template: `%s | ${env.siteName}` },
  description: "Portefeuilles, sacs, montres, bracelets, lunettes et bijoux : des accessoires de mode choisis avec soin pour homme et femme.",
  openGraph: { type: "website", siteName: env.siteName, locale: "fr_FR" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
