import { cn } from "@/lib/utils";

/** Image produit lazy-loadée ; placeholder élégant si aucune image. */
export function ProductImage({ src, alt, className, priority }: { src?: string; alt: string; className?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-100 to-sand-200", className)} aria-label={alt}>
        <span className="font-display text-5xl text-brass/60">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className={cn("h-full w-full object-cover", className)} />;
}
