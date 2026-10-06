import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/lib/data";
import { env } from "@/lib/env";
import { Gallery } from "@/components/shop/Gallery";
import { AddToCart } from "@/components/shop/AddToCart";
import { Price } from "@/components/ui/Price";
import { ProductGrid } from "@/components/shop/ProductGrid";

type Params = Promise<{ slug: string }>;
const GENDER_LABEL = { homme: "Homme", femme: "Femme", unisex: "Unisex" } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Produit introuvable" };
  const desc = p.description.replace(/\s+/g, " ").slice(0, 160) || `${p.name} — ${p.category?.name}`;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: desc, type: "website", images: p.images[0] ? [{ url: p.images[0] }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const related = await getRelated(p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.sku,
    image: p.images.map((i) => (i.startsWith("http") ? i : `${env.siteUrl}${i}`)),
    category: p.category?.name,
    offers: {
      "@type": "Offer",
      url: `${env.siteUrl}/products/${p.slug}`,
      priceCurrency: "TND",
      price: p.currentPrice.toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-xs text-ink/50" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-ink">Accueil</Link> / <Link href="/products" className="hover:text-ink">Boutique</Link>
        {p.category && <> / <Link href={`/products?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link></>}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} name={p.name} />
        <div className="lg:py-4">
          <p className="eyebrow">{GENDER_LABEL[p.gender]} · {p.category?.name}</p>
          <h1 className="h-display mt-2 text-3xl sm:text-4xl">{p.name}</h1>
          <div className="mt-4"><Price size="lg" price={p.price} salePrice={p.salePrice} compareAt={p.compareAtPrice} onSale={p.isOnSale} /></div>
          {p.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-ink/70">{p.description}</p>}
          <div className="mt-8 border-t border-ink/10 pt-8"><AddToCart product={p} /></div>
          <p className="mt-6 text-xs text-ink/45">Réf. {p.sku} · Paiement à la livraison</p>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="h-display mb-8 text-3xl">Vous aimerez aussi</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
