"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Pièces jointes d'un message de la conversation : photos (agrandies sur la même page) et messages vocaux (lecteur audio). */
export type ViewAttachment = { kind: "image" | "audio"; url: string; duration?: number | null };

export const fmtDuration = (s?: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);

/** Visionneuse plein écran : la photo s'ouvre par-dessus la page (pas de nouvel onglet). Échap, clic dans le fond ou croix pour fermer ; flèches pour passer d'une photo à l'autre. */
function Lightbox({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const many = urls.length > 1;
  const go = useCallback((d: number) => setI((x) => (x + d + urls.length) % urls.length), [urls.length]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (many && e.key === "ArrowRight") go(1);
      else if (many && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // la page derrière ne défile pas
    closeRef.current?.focus();
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose, go, many]);

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-3 sm:p-8"
      role="dialog" aria-modal="true" aria-label="Photo en grand"
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { // balayage horizontal : photo précédente / suivante
        const x0 = touchX.current; touchX.current = null;
        if (x0 == null || !many) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer la photo" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:right-6 sm:top-6"><X size={22} /></button>
      {many && <>
        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:left-6"><ChevronLeft size={24} /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:right-6"><ChevronRight size={24} /></button>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums text-white backdrop-blur" aria-live="polite">{i + 1} / {urls.length}</span>
      </>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={urls[i]} src={urls[i]} alt={`Photo ${i + 1} sur ${urls.length}`} onClick={(e) => e.stopPropagation()} className="max-h-[88dvh] max-w-full rounded-lg object-contain shadow-2xl" />
    </div>,
    document.body,
  );
}

export function AttachmentList({ items, tone = "light" }: { items: ViewAttachment[]; tone?: "light" | "dark" }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  if (!items.length) return null;
  const images = items.filter((a) => a.kind === "image");
  const audios = items.filter((a) => a.kind === "audio");
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a, n) => (
            <button key={a.url} type="button" onClick={() => setOpen(n)} className="block overflow-hidden rounded-xl border border-black/10" aria-label={`Agrandir la photo ${n + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="Photo jointe" loading="lazy" decoding="async" className="h-24 w-24 object-cover sm:h-28 sm:w-28" />
            </button>
          ))}
        </div>
      )}
      {audios.map((a) => (
        <div key={a.url} className={`flex items-center gap-2 rounded-xl p-2 ${tone === "dark" ? "bg-white/10" : "bg-sand-100"}`}>
          <audio controls preload="none" src={a.url} className="h-9 w-full min-w-0 max-w-xs" aria-label="Message vocal" />
          {a.duration != null && <span className="shrink-0 text-xs tabular-nums opacity-70">{fmtDuration(a.duration)}</span>}
        </div>
      ))}
      {open !== null && <Lightbox urls={images.map((a) => a.url)} start={open} onClose={close} />}
    </div>
  );
}
