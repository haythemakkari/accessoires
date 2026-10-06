import type { ProductDTO } from "@/lib/data";
import { ProductCard } from "./ProductCard";
import { Reveal } from "@/components/ui/Reveal";

export function ProductGrid({ products, animate = true }: { products: ProductDTO[]; animate?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) =>
        animate ? (
          <Reveal key={p._id} delay={(i % 4) * 0.06}>
            <ProductCard p={p} />
          </Reveal>
        ) : (
          <ProductCard key={p._id} p={p} />
        ),
      )}
    </div>
  );
}
