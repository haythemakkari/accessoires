import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { JsonLd } from "@/components/seo/JsonLd";
import { OG_DEFAULT, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { getCategories, type ProductDTO } from "@/lib/data";
import { listProducts } from "@/services/product.service";
import { productListQuery } from "@/validation/schemas";
import { FilterSidebar, ShopToolbar } from "@/components/shop/Filters";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Pagination } from "@/components/shop/Pagination";

type SP = Promise<Record<string, string | undefined>>;

const GENDERS = { femme: "femme", homme: "homme" } as const;
/** Paramètres qui créent une infinité de pages quasi identiques (tri, filtres, recherche) : jamais indexés. */
const FACETS = ["q", "sort", "minPrice", "maxPrice", "inStock", "onSale", "featured"] as const;

/** URL canonique d'une liste : uniquement genre + catégorie (+ page). C'est ce qu'on veut voir dans Google. */
function listUrl(gender?: string, category?: string, page = 1) {
  const sp = new URLSearchParams();
  if (gender) sp.set("gender", gender);
  if (category) sp.set("category", category);
  if (page > 1) sp.set("page", String(page));
  const q = sp.toString();
  return `/products${q ? `?${q}` : ""}`;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = (await getCategories()).find((c) => c.slug === sp.category);
  const gender = GENDERS[sp.gender as keyof typeof GENDERS];
  const page = Math.max(1, Number(sp.page) || 1);
  const facet = FACETS.some((k) => sp[k]);
  const site = env.siteName;

  const title = sp.q ? `Recherche « ${sp.q.slice(0, 60)} »` : cat ? `${cat.name}${gender ? ` ${gender}` : ""}` : gender ? `Accessoires ${gender}` : "Boutique";
  const base = cat
    ? `${cat.name}${gender ? ` pour ${gender}` : ""} : découvrez notre sélection chez ${site}.`
    : gender
      ? `Accessoires de mode pour ${gender} : bijoux, montres, sacs, bracelets et plus encore chez ${site}.`
      : `Toute la boutique ${site} : bijoux, montres, sacs, bracelets, ceintures et accessoires de mode pour femme et homme.`;
  const description = `${cat?.description ? `${cat.description} ` : ""}${base} Livraison partout en Tunisie, paiement à la livraison.`.slice(0, 300);
  const canonical = listUrl(gender, cat?.slug, page);
  return {
    title: page > 1 ? `${title} — page ${page}` : title,
    description,
    // Les pages triées / filtrées / de recherche pointent vers la liste « propre » et ne sont pas indexées (évite le contenu dupliqué).
    alternates: { canonical: facet ? listUrl(gender, cat?.slug) : canonical },
    robots: facet ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: "website", images: [OG_DEFAULT] },
    twitter: { card: "summary_large_image", title, description, images: [OG_DEFAULT.url] },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const parsed = productListQuery.safeParse(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)));
  const query = parsed.success ? parsed.data : productListQuery.parse({});
  await connectDB();
  const [categories, result] = await Promise.all([getCategories(), listProducts(query)]);
  const items = result.items as unknown as ProductDTO[];
  const current = categories.find((c) => c.slug === query.category);

  const genderName = query.gender && query.gender !== "unisex" ? { femme: "Femme", homme: "Homme" }[query.gender] : null;
  const crumbs = [
    { name: "Accueil", path: "/" },
    { name: "Boutique", path: "/products" },
    ...(genderName ? [{ name: genderName, path: `/products?gender=${query.gender}` }] : []),
    ...(current ? [{ name: current.name, path: `/products?${genderName ? `gender=${query.gender}&` : ""}category=${current.slug}` }] : []),
  ];

  return (
    <div className="container-x py-10">
      <JsonLd data={[
        breadcrumbJsonLd(crumbs),
        { "@type": "ItemList", itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: (result.page - 1) * query.limit + i + 1, url: absoluteUrl(`/products/${p.slug}`), name: p.name })) },
      ]} />
      <nav aria-label="Fil d'Ariane" className="mb-4 text-xs text-ink/65">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i === crumbs.length - 1 ? <span aria-current="page" className="text-ink">{c.name}</span> : <Link href={c.path} className="hover:text-ink">{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <header className="mb-8">
        <p className="eyebrow">{query.q ? "Recherche" : "Boutique"}</p>
        <h1 className="h-display mt-2 text-4xl">{query.q ? `Résultats pour « ${query.q} »` : `${current?.name ?? "Tous les produits"}${query.gender ? ` · ${{ homme: "Homme", femme: "Femme", unisex: "Unisex" }[query.gender]}` : ""}`}</h1>
        {current?.description && <p className="mt-2 max-w-xl text-ink/60">{current.description}</p>}
        <p className="mt-2 hidden text-sm text-ink/65 lg:block">{result.total} produit{result.total > 1 ? "s" : ""}</p>
      </header>
      <div className="flex gap-10">
        <Suspense><FilterSidebar categories={categories} /></Suspense>
        <div className="min-w-0 flex-1">
          <Suspense><ShopToolbar categories={categories} total={result.total} /></Suspense>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/20 py-20 text-center">
              <p className="h-display text-2xl">Aucun produit trouvé</p>
              <p className="mt-2 text-sm text-ink/60">Essayez d’élargir votre recherche ou de retirer des filtres.</p>
            </div>
          ) : (
            <ProductGrid products={items} animate={false} priorityCount={4} headingLevel={2} />
          )}
          <Pagination page={result.page} pages={result.pages} params={sp} />
        </div>
      </div>
    </div>
  );
}
