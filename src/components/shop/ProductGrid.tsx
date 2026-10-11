import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductDTO } from "@/lib/data";
import { ProductCard } from "./ProductCard";
import { Reveal } from "@/components/ui/Reveal";

/**
 * priorityCount : nombre de premières cartes dont l'image est chargée en priorité (au-dessus de la ligne de flottaison → meilleur LCP).
 * headingLevel : niveau de titre des cartes (2 si la page n'a pas de titre de section intermédiaire).
 * swipe : sur téléphone, les produits sont alignés sur UNE ligne qu'on fait glisser du doigt (carrousel avec accroche) ; la grille reste inchangée dès `sm`.
 * desktopLimit : en mode swipe, nombre de produits gardés sur la grille (les suivants ne sont visibles que dans le carrousel du téléphone).
 * moreHref : en mode swipe, dernière carte « Tout voir ».
 */
export function ProductGrid({ products, animate = true, priorityCount = 0, headingLevel = 3, promoSoon = false, swipe = false, desktopLimit, moreHref }: {
  products: ProductDTO[]; animate?: boolean; priorityCount?: number; headingLevel?: 2 | 3; promoSoon?: boolean; swipe?: boolean; desktopLimit?: number; moreHref?: string;
}) {
  if (swipe) {
    return (
      <div
        role="list"
        aria-label="Produits (faites glisser pour voir la suite)"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p, i) => (
          <div key={p._id} role="listitem" className={`w-[46%] max-w-[15rem] shrink-0 snap-start sm:w-auto sm:max-w-none ${desktopLimit != null && i >= desktopLimit ? "sm:hidden" : ""}`}>
            <ProductCard p={p} priority={i < priorityCount} headingLevel={headingLevel} promoSoon={promoSoon} />
          </div>
        ))}
        {moreHref && (
          <Link href={moreHref} className="flex w-[34%] max-w-[10rem] shrink-0 snap-start flex-col items-center justify-center gap-3 self-start rounded-2xl border border-dashed border-ink/25 py-24 text-sm font-medium sm:hidden" aria-label="Voir tous les produits">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-sand-50"><ArrowRight size={20} /></span>
            Tout voir
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) =>
        animate ? (
          <Reveal key={p._id} delay={(i % 4) * 0.06}>
            <ProductCard p={p} priority={i < priorityCount} headingLevel={headingLevel} promoSoon={promoSoon} />
          </Reveal>
        ) : (
          <ProductCard key={p._id} p={p} priority={i < priorityCount} headingLevel={headingLevel} promoSoon={promoSoon} />
        ),
      )}
    </div>
  );
}
