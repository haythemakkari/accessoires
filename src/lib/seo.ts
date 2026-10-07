import { env } from "./env";
import type { ShopSettings } from "@/models/Settings";
import { SOCIAL_LINKS } from "./navigation";

export const absoluteUrl = (path = "/") => new URL(path, env.siteUrl).toString();

export const SITE_DESCRIPTION =
  "Bijoux, montres, sacs, bracelets, ceintures et accessoires de mode pour femme et homme. Livraison partout en Tunisie, paiement à la livraison.";
export const OG_DEFAULT = { url: "/og-default.png", width: 1200, height: 630, alt: "Accessoires Plus" };
export const GENDER_WORD = { femme: "femme", homme: "homme", unisex: "mixte" } as const;

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

/** Entreprise + site (avec recherche interne) : affiché dans les résultats Google (knowledge panel, sitelinks search box). */
export function organizationJsonLd(s: Pick<ShopSettings, "contactEmail" | "contactPhone" | "contactAddress">) {
  const contact = {
    "@type": "ContactPoint",
    contactType: "customer service",
    areaServed: "TN",
    availableLanguage: ["fr"],
    ...(s.contactPhone && { telephone: s.contactPhone }),
    ...(s.contactEmail && { email: s.contactEmail }),
  };
  return [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: env.siteName,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icons/icon-512.png"),
      sameAs: [SOCIAL_LINKS.instagram],
      ...(s.contactAddress && { address: { "@type": "PostalAddress", streetAddress: s.contactAddress, addressCountry: "TN" } }),
      ...((s.contactPhone || s.contactEmail) && { contactPoint: contact }),
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: absoluteUrl("/"),
      name: env.siteName,
      inLanguage: "fr",
      publisher: { "@id": absoluteUrl("/#organization") },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/products")}?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
  ];
}
