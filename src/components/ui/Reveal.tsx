"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Apparition douce au scroll, sans bibliothèque d'animation (économise ~35 Ko de JavaScript).
 * - Rendu serveur : contenu visible (aucun texte caché pour les robots ni sans JavaScript).
 * - Au chargement, ce qui est déjà à l'écran reste tel quel (pas de retard sur le LCP) ; seul ce qui est plus bas est masqué puis révélé en entrant dans l'écran.
 * - Un seul IntersectionObserver partagé, aucune lecture de mise en page (pas de « forced reflow »).
 */
type Listener = (visible: boolean) => void;
const listeners = new WeakMap<Element, Listener>();
let observer: IntersectionObserver | null = null;
const getObserver = () =>
  (observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        listeners.get(e.target)?.(e.isIntersecting);
        if (e.isIntersecting) { observer?.unobserve(e.target); listeners.delete(e.target); } // une seule fois
      }
    },
    { rootMargin: "0px 0px -60px 0px" },
  ));

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"init" | "hidden" | "shown">("init");
  const first = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    first.current = true;
    listeners.set(el, (visible) => {
      if (first.current) {
        first.current = false;
        if (visible) return; // déjà à l'écran au chargement : on ne touche à rien
        setPhase("hidden"); // plus bas dans la page : masqué en attendant (hors écran, donc sans effet visible)
        return;
      }
      if (visible) setPhase("shown");
    });
    getObserver().observe(el);
    return () => { getObserver().unobserve(el); listeners.delete(el); };
  }, []);

  const cls = phase === "init" ? "" : phase === "hidden" ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100";
  return (
    <div ref={ref} className={`${phase === "init" ? "" : "transition duration-700 ease-out will-change-[opacity,transform]"} ${cls} ${className ?? ""}`} style={phase === "shown" && delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
