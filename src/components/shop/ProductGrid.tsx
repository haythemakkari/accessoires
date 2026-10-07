import type { ProductDTO } from "@/lib/data";
import { ProductCard } from "./ProductCard";
import { Reveal } from "@/components/ui/Reveal";

/**
 * priorityCount : nombre de premières cartes dont l'image est chargée en priorité (au-dessus de la ligne de flottaison → meilleur LCP).
 * headingLevel : niveau de titre des cartes (2 si la page n'a pas de titre de section intermédiaire).
 */
export function ProductGrid({ products, animate = true, priorityCount = 0, headingLevel = 3 }: { products: ProductDTO[]; animate?: boolean; priorityCount?: number; headingLevel?: 2 | 3 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) =>
        animate ? (
          <Reveal key={p._id} delay={(i % 4) * 0.06}>
            <ProductCard p={p} priority={i < priorityCount} headingLevel={headingLevel} />
          </Reveal>
        ) : (
          <ProductCard key={p._id} p={p} priority={i < priorityCount} headingLevel={headingLevel} />
        ),
      )}
    </div>
  );
}
