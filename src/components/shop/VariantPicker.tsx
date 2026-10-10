"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { VariantLike } from "@/lib/variants";

/**
 * Sélecteur d'options affiché directement sur une carte produit : « Choisissez votre pointure » + une pastille par option.
 * Plusieurs variantes (couleur, puis taille…) : elles se choisissent l'une après l'autre ; le dernier choix valide.
 */
export function VariantPicker({ variants, onPick, onClose, className = "" }: { variants: VariantLike[]; onPick: (variant: string) => void; onClose: () => void; className?: string }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const step = variants[chosen.length];
  if (!step) return null;
  const choose = (option: string) => {
    const next = [...chosen, option];
    if (next.length === variants.length) onPick(next.join(" / "));
    else setChosen(next);
  };
  const label = step.name.toLowerCase();
  return (
    <div role="group" aria-label={`Choisissez votre ${label}`} className={`rounded-2xl bg-white p-3 shadow-xl ring-1 ring-ink/10 ${className}`}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-tight">Choisissez votre {label}</p>
        <button type="button" onClick={onClose} aria-label="Fermer le choix" className="-mr-1 -mt-1 rounded-full p-1 text-ink/70 hover:bg-sand-100"><X size={18} /></button>
      </div>
      {chosen.length > 0 && <p className="mb-2 text-xs text-ink/60">{chosen.join(" / ")}</p>}
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {step.options.map((o) => (
          <button key={o} type="button" onClick={() => choose(o)} className="min-w-[2.75rem] flex-1 basis-[2.75rem] rounded-xl border-2 border-ink px-2 py-2 text-center text-sm font-bold transition hover:bg-ink hover:text-sand-50 active:scale-95">{o}</button>
        ))}
      </div>
    </div>
  );
}
