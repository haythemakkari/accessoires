"use client";
import { useEffect, useRef, useState } from "react";
import { useVariantChoice } from "./VariantContext";
import { ProductImage } from "@/components/ui/ProductImage";
import { mediaUrl } from "@/lib/media";
import { ZoomIn, X } from "lucide-react";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const { choice, selectedImage, packaging } = useVariantChoice();
  // Image choisie en cliquant une miniature. Un nouveau choix de couleur reprend la main et affiche l'image de CETTE couleur.
  const [manual, setManual] = useState<string | null>(null);
  useEffect(() => { setManual(null); }, [selectedImage]);
  // Packaging avec photo : choisir l'option affiche sa photo ; choisir « emballage standard » (ou une option sans photo) revient au produit.
  // Les photos du produit restent dans les miniatures. Au chargement, l'option par défaut ne remplace pas la photo principale.
  const packagingImage = packaging?.image || null;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setManual(packagingImage);
  }, [packaging?._id, packagingImage]);
  const thumbs = packagingImage && !images.includes(packagingImage) ? [...images, packagingImage] : images;
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hover, setHover] = useState(false);
  const current = manual ?? selectedImage ?? images[0];
  const label = Object.values(choice).filter(Boolean).join(" / ");
  const alt = label ? `${name} — ${label}` : name;

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {thumbs.length > 1 && (
        <div className="flex gap-3 sm:w-20 sm:flex-col">
          {thumbs.map((src, i) => {
            const isPackaging = src === packagingImage && !images.includes(src);
            return (
              <button key={src} onClick={() => setManual(src)} aria-label={isPackaging ? `Photo du packaging ${packaging?.name}` : `Image ${i + 1}`}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-full ${src === current ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}>
                <ProductImage src={src} alt={isPackaging ? `Packaging ${packaging?.name}` : `${name} ${i + 1}`} sizes="80px" />
                {isPackaging && <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-medium text-white">Packaging</span>}
              </button>
            );
          })}
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
        {packagingImage && current === packagingImage && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">Packaging : {packaging?.name}</span>}
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
