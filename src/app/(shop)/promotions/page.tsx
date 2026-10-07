import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import { listProducts } from "@/services/product.service";
import { productListQuery } from "@/validation/schemas";
import type { ProductDTO } from "@/lib/data";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Pagination } from "@/components/shop/Pagination";

export const metadata: Metadata = { title: "Promotions", description: "Profitez de prix réduits sur une sélection d'accessoires de mode pour femme et homme : bijoux, montres, sacs… Livraison partout en Tunisie, paiement à la livraison." };

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  await connectDB();
  const r = await listProducts(productListQuery.parse({ onSale: "true", page: page ?? 1 }));
  return (
    <div className="container-x py-10">
      <p className="eyebrow">Offres</p>
      <h1 className="h-display mt-2 text-4xl">Promotions</h1>
      <div className="mt-8">
        {r.items.length ? <ProductGrid products={r.items as unknown as ProductDTO[]} animate={false} priorityCount={4} headingLevel={2} /> : <p className="py-16 text-center text-ink/60">Aucune promotion en ce moment. Revenez bientôt !</p>}
      </div>
      <Pagination page={r.page} pages={r.pages} params={{}} />
    </div>
  );
}
