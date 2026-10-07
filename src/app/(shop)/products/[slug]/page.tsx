import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated, getShopSettings } from "@/lib/data";
import { JsonLd } from "@/components/seo/JsonLd";
import { GENDER_WORD, OG_DEFAULT, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import { Gallery } from "@/components/shop/Gallery";
import { AddToCart } from "@/components/shop/AddToCart";
import { VariantProvider } from "@/components/shop/VariantContext";
import { allOptionImages } from "@/lib/variants";
import { Price } from "@/components/ui/Price";
import { ProductGrid } from "@/components/shop/ProductGrid";

export const revalidate = 60; // générée à la 1ʳᵉ visite puis mise en cache 60 s (pas de base requise au build)

type Params = Promise<{ slug: string }>;
/** URL absolue d'une image en version optimisée (1200 px) pour OG et JSON-LD. */
const abs = (i: string) => { const u = mediaUrl(i, 1200); return u.startsWith("http") ? u : `${env.siteUrl}${u}`; };
const GENDER_LABEL = { homme: "Homme", femme: "Femme", unisex: "Unisex" } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  // Description : texte de l'admin, sinon description générée (jamais vide : un snippet vide est remplacé au hasard par Google)
  const text = p.description.replace(/\s+/g, " ").trim();
  const tail = "Livraison partout en Tunisie, paiement à la livraison.";
  const generated = `${p.name} — ${p.category?.name ?? "accessoire"} pour ${GENDER_WORD[p.gender]}.`;
  // Une description trop courte est complétée (l'idéal pour un extrait Google : 120 à 155 caractères)
  const desc = text.length > 155 ? `${text.slice(0, 152).trimEnd()}…` : `${text || generated} ${text.length < 110 ? tail : ""}`.trim();
  const url = `/products/${p.slug}`;
  const img = p.images[0] ? [{ url: abs(p.images[0]), width: 1200, alt: p.name }] : [OG_DEFAULT]; // sans image produit : image de marque
  return {
    title: p.category ? `${p.name} — ${p.category.name}` : p.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: p.name, description: desc, type: "website", url, images: img },
    twitter: { card: "summary_large_image", title: p.name, description: desc, images: img.map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const [related, settings] = await Promise.all([getRelated(p), getShopSettings()]);

  const url = absoluteUrl(`/products/${p.slug}`);
  const crumbs = [{ name: "Accueil", path: "/" }, { name: "Boutique", path: "/products" }, ...(p.category ? [{ name: p.category.name, path: `/products?category=${p.category.slug}` }] : []), { name: p.name, path: `/products/${p.slug}` }];
  // Product + offre + livraison + retours : éligible aux résultats enrichis (prix, disponibilité, expédition, retours)
  const jsonLd = [
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: p.name,
      description: p.description || undefined,
      sku: p.sku,
      image: [...new Set([...p.images, ...allOptionImages(p.variants)])].map(abs), // inclut les photos de chaque couleur
      category: p.category?.name,
      brand: { "@type": "Brand", name: env.siteName },
      url,
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "TND",
        price: p.currentPrice.toFixed(2),
        priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        itemCondition: "https://schema.org/NewCondition",
        availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: env.siteName },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: settings.shippingFee, currency: "TND" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "TN" },
        },
        hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "TN", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 7 },
      },
    },
    breadcrumbJsonLd(crumbs),
  ];

  return (
    <div className="container-x py-8">
      <JsonLd data={jsonLd} />
      <nav className="mb-6 text-xs text-ink/60" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-ink">Accueil</Link> / <Link href="/products" className="hover:text-ink">Boutique</Link>
        {p.category && <> / <Link href={`/products?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link></>}
      </nav>
      <VariantProvider variants={p.variants}>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} name={p.name} />
        <div className="lg:py-4">
          <p className="eyebrow">{GENDER_LABEL[p.gender]} · {p.category?.name}</p>
          <h1 className="h-display mt-2 text-3xl sm:text-4xl">{p.name}</h1>
          <div className="mt-4"><Price size="lg" price={p.price} salePrice={p.salePrice} compareAt={p.compareAtPrice} onSale={p.isOnSale} /></div>
          {p.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/70">{p.description}</p>}
          <div className="mt-8 border-t border-ink/10 pt-8"><AddToCart product={p} /></div>
          <p className="mt-6 text-xs text-ink/60">Réf. {p.sku} · Paiement à la livraison</p>
        </div>
      </div>
      </VariantProvider>
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="h-display mb-8 text-3xl">Vous aimerez aussi</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
