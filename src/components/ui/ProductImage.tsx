import { cn } from "@/lib/utils";
import { mediaSrcSet, mediaUrl } from "@/lib/media";

/**
 * Image produit : le navigateur choisit la version WebP la plus petite suffisante (srcset + sizes), chargement différé
 * sauf image prioritaire (premier écran). `sizes` = largeur d'affichage approximative selon la taille d'écran.
 * Placeholder élégant si aucune image.
 */
export function ProductImage({ src, alt, className, priority, sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" }: { src?: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  if (!src) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-100 to-sand-200", className)} aria-label={alt}>
        <span className="font-display text-5xl text-brass/60">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(src, 640)} srcSet={mediaSrcSet(src)} sizes={sizes} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" className={cn("h-full w-full object-cover", className)} />;
}
