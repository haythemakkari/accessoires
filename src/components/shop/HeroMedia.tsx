"use client";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { mediaSrcSet, mediaUrl } from "@/lib/media";

type Props = { type: "image" | "video"; images: string[]; url: string; poster?: string; alt: string };

/** Délai entre deux photos du diaporama. */
export const SLIDE_INTERVAL_MS = 2000;
const SIZES = "(max-width: 768px) 90vw, 448px";

/** Connexion lente ou préférence « réduire les animations » : pas de téléchargement superflu, pas de mouvement automatique. */
function useLite() {
  const [lite, setLite] = useState<boolean | null>(null); // null = pas encore évalué (rendu serveur)
  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = c?.saveData === true || /(^|-)2g$|^3g$/.test(c?.effectiveType ?? "");
    setLite(slow || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return lite;
}

function Img({ src, alt, eager, className }: { src: string; alt: string; eager?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(src, 800)} srcSet={mediaSrcSet(src)} sizes={SIZES} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "low"} decoding="async" className={className ?? "absolute inset-0 h-full w-full object-cover"} />;
}

/** Diaporama : les photos se fondent l'une dans l'autre toutes les 2 s. Pause au survol et quand l'onglet est caché. */
function Slideshow({ images, alt }: { images: string[]; alt: string }) {
  const lite = useLite();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (lite !== false || count < 2 || paused) return;
    const t = setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % count); }, SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [lite, count, paused]);

  // Connexion lente / animations réduites / une seule photo : on n'affiche et ne télécharge que la première.
  const shown = lite === false ? images : images.slice(0, 1);
  return (
    <div className="absolute inset-0" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} role="img" aria-label={alt}>
      {shown.map((src, k) => (
        <div key={src + k} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${k === i ? "opacity-100" : "opacity-0"}`} aria-hidden={k !== i}>
          <Img src={src} alt={k === i ? alt : ""} eager={k === 0} />
        </div>
      ))}
      {lite === false && count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
          {images.map((_, k) => <span key={k} className={`h-1.5 rounded-full bg-white/90 shadow transition-all duration-300 ${k === i ? "w-5" : "w-1.5 opacity-60"}`} />)}
        </div>
      )}
    </div>
  );
}

/** Média principal de l'accueil, choisi par l'admin : diaporama de photos ou courte vidéo muette en boucle. */
export function HeroMedia({ type, images, url, poster, alt }: Props) {
  const lite = useLite();
  const [forcePlay, setForcePlay] = useState(false);

  if (type === "image") return <Slideshow images={images} alt={alt} />;

  const play = forcePlay || lite === false;
  const posterImg = poster ? <Img src={poster} alt={alt} eager /> : <div className="absolute inset-0 bg-gradient-to-br from-sand-100 to-sand-200" aria-label={alt} />;
  return (
    <div className="absolute inset-0">
      {!play && posterImg}
      {play && <video src={url} poster={poster ? mediaUrl(poster, 800) : undefined} muted loop playsInline autoPlay preload="metadata" aria-label={alt} className="h-full w-full object-cover" />}
      {lite === true && !forcePlay && (
        <button type="button" onClick={() => setForcePlay(true)} aria-label="Lire la vidéo" className="absolute inset-0 flex items-center justify-center bg-ink/10 transition hover:bg-ink/20">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg"><Play size={26} className="translate-x-0.5" fill="currentColor" /></span>
        </button>
      )}
    </div>
  );
}
