"use client";
import { useEffect, useState } from "react";
import { useVariantChoice } from "./VariantContext";
import { ProductImage } from "@/components/ui/ProductImage";
import { mediaUrl } from "@/lib/media";
import { ZoomIn, X } from "lucide-react";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const { choice, selectedImage } = useVariantChoice();
  // Image choisie en cliquant une miniature. Un nouveau choix de couleur reprend la main et affiche l'image de CETTE couleur.
  const [manual, setManual] = useState<string | null>(null);
  useEffect(() => { setManual(null); }, [selectedImage]);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);
  const current = manual ?? selectedImage ?? images[0];
  const label = Object.values(choice).filter(Boolean).join(" / ");
  const alt = label ? `${name} — ${label}` : name;

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {images.length > 1 && (
        <div className="flex gap-3 sm:w-20 sm:flex-col">
          {images.map((src, i) => (
            <button key={src} onClick={() => setManual(src)} aria-label={`Image ${i + 1}`}
              className={`aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-full ${src === current ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <ProductImage src={src} alt={`${name} ${i + 1}`} sizes="80px" />
            </button>
          ))}
        </div>
      )}
      <div
        className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-sand-100"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onClick={() => current && setZoom(true)}
      >
        <div key={current} className="h-full w-full animate-fade-in transition-transform duration-200" style={hover && current ? { transform: "scale(1.8)", transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}>
          <ProductImage src={current} alt={alt} priority sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
        {current && <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 p-2"><ZoomIn size={16} /></span>}
      </div>
      {zoom && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4" onClick={() => setZoom(false)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Fermer"><X size={28} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(current, 1600)} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
