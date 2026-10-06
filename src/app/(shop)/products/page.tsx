import type { Metadata } from "next";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { getCategories, type ProductDTO } from "@/lib/data";
import { listProducts } from "@/services/product.service";
import { productListQuery } from "@/validation/schemas";
import { FilterSidebar, ShopToolbar } from "@/components/shop/Filters";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Pagination } from "@/components/shop/Pagination";

type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = (await getCategories()).find((c) => c.slug === sp.category);
  const title = sp.q ? `Recherche « ${sp.q} »` : cat ? cat.name : "Boutique";
  return {
    title,
    description: cat?.description ?? "Parcourez tous nos accessoires de mode pour homme et femme.",
    alternates: { canonical: "/products" + (cat ? `?category=${cat.slug}` : "") },
    robots: sp.q ? { index: false } : undefined,
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

  return (
    <div className="container-x py-10">
      <header className="mb-8">
        <p className="eyebrow">{query.q ? "Recherche" : "Boutique"}</p>
        <h1 className="h-display mt-2 text-4xl">{query.q ? `Résultats pour « ${query.q} »` : `${current?.name ?? "Tous les produits"}${query.gender ? ` · ${{ homme: "Homme", femme: "Femme", unisex: "Unisex" }[query.gender]}` : ""}`}</h1>
        {current?.description && <p className="mt-2 max-w-xl text-ink/60">{current.description}</p>}
        <p className="mt-2 text-sm text-ink/50">{result.total} produit{result.total > 1 ? "s" : ""}</p>
      </header>
      <div className="flex gap-10">
        <Suspense><FilterSidebar categories={categories} /></Suspense>
        <div className="min-w-0 flex-1">
          <Suspense><ShopToolbar categories={categories} /></Suspense>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/20 py-20 text-center">
              <p className="h-display text-2xl">Aucun produit trouvé</p>
              <p className="mt-2 text-sm text-ink/55">Essayez d’élargir votre recherche ou de retirer des filtres.</p>
            </div>
          ) : (
            <ProductGrid products={items} animate={false} />
          )}
          <Pagination page={result.page} pages={result.pages} params={sp} />
        </div>
      </div>
    </div>
  );
}
