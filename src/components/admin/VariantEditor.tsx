"use client";
import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { mediaUrl } from "@/lib/media";
import type { VariantLike } from "@/lib/variants";

export type OptionState = { label: string; image: string };
export type VariantState = { name: string; options: OptionState[] };

export const toVariantState = (variants: VariantLike[]): VariantState[] =>
  variants.map((v) => ({ name: v.name, options: v.options.map((label) => ({ label, image: v.optionImages?.find((o) => o.option === label)?.image ?? "" })) }));

/** Format attendu par l'API : options = libellés, optionImages = uniquement les options qui ont une image. */
export const toVariantPayload = (variants: VariantState[]) =>
  variants
    .filter((v) => v.name.trim())
    .map((v) => {
      const opts = v.options.map((o) => ({ label: o.label.trim(), image: o.image })).filter((o) => o.label);
      return { name: v.name.trim(), options: opts.map((o) => o.label), optionImages: opts.filter((o) => o.image).map((o) => ({ option: o.label, image: o.image })) };
    });

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Échec de l'envoi");
  return data.urls[0];
}

/** Variantes du produit (couleur, taille…). Chaque option peut avoir SA photo : le client la voit dès qu'il choisit l'option. */
export function VariantEditor({ value, onChange, productImages }: { value: VariantState[]; onChange: (v: VariantState[]) => void; productImages: string[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = useRef<{ vi: number; oi: number } | null>(null);

  const patchVariant = (vi: number, patch: Partial<VariantState>) => onChange(value.map((v, k) => (k === vi ? { ...v, ...patch } : v)));
  const patchOption = (vi: number, oi: number, patch: Partial<OptionState>) =>
    patchVariant(vi, { options: value[vi].options.map((o, k) => (k === oi ? { ...o, ...patch } : o)) });

  const pickFile = (vi: number, oi: number) => { target.current = { vi, oi }; fileInput.current?.click(); };
  const onFile = async (file?: File) => {
    const t = target.current;
    if (!file || !t) return;
    setBusy(`${t.vi}-${t.oi}`);
    try { patchOption(t.vi, t.oi, { image: await uploadImage(file) }); toast.success("Image associée à l'option"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <section className="a-card space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Variantes <span className="font-normal text-slate-400">· stock partagé · une image par option</span></p>
        <button type="button" className="a-btn-ghost" onClick={() => onChange([...value, { name: value.length === 0 ? "Couleur" : "", options: [{ label: "", image: "" }] }])}><Plus size={14} /> Ajouter une variante</button>
      </div>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {value.map((v, vi) => (
        <div key={vi} className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="flex gap-2">
            <input className="a-input" placeholder="Nom de la variante (ex. Couleur)" value={v.name} onChange={(e) => patchVariant(vi, { name: e.target.value })} aria-label="Nom de la variante" />
            <button type="button" className="a-btn-ghost text-rose-600" onClick={() => onChange(value.filter((_, k) => k !== vi))} aria-label="Supprimer la variante"><Trash2 size={15} /></button>
          </div>

          <ul className="space-y-2">
            {v.options.map((o, oi) => (
              <li key={oi} className="flex items-center gap-2">
                {/* Image de l'option : clic pour envoyer une photo */}
                <div className="relative h-12 w-12 shrink-0">
                  <button type="button" onClick={() => pickFile(vi, oi)} aria-label={o.image ? "Changer l'image de l'option" : "Ajouter une image à l'option"} disabled={busy === `${vi}-${oi}`}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-500">
                    {o.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(o.image, 160)} alt="" className="h-full w-full object-cover" /> : busy === `${vi}-${oi}` ? <span className="text-[10px]">…</span> : <ImagePlus size={18} />}
                  </button>
                  {o.image && <button type="button" onClick={() => patchOption(vi, oi, { image: "" })} aria-label="Retirer l'image" className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-700 p-0.5 text-white"><X size={11} /></button>}
                </div>
                <input className="a-input" placeholder="Ex. Noir" value={o.label} aria-label="Nom de l'option"
                  onChange={(e) => patchOption(vi, oi, { label: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); patchVariant(vi, { options: [...v.options, { label: "", image: "" }] }); } }} />
                {productImages.length > 0 && (
                  <select className="a-input !w-40 shrink-0" aria-label="Utiliser une image déjà ajoutée au produit" value="" onChange={(e) => e.target.value && patchOption(vi, oi, { image: e.target.value })}>
                    <option value="">Image existante…</option>
                    {productImages.map((src, k) => <option key={src} value={src}>Image {k + 1}</option>)}
                  </select>
                )}
                <button type="button" className="a-btn-ghost !px-2 text-rose-600" onClick={() => patchVariant(vi, { options: v.options.filter((_, k) => k !== oi) })} aria-label="Supprimer l'option"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="a-btn-ghost" onClick={() => patchVariant(vi, { options: [...v.options, { label: "", image: "" }] })}><Plus size={14} /> Ajouter une option</button>
        </div>
      ))}

      {value.length === 0 && <p className="text-sm text-slate-500">Aucune variante. Ajoutez par exemple « Couleur » avec Noir, Marron… puis une photo pour chaque couleur.</p>}
      {value.length > 0 && <p className="text-xs text-slate-500">Quand le client choisit une option qui a une image, la photo principale de la fiche produit change automatiquement. Sans image, la photo principale reste affichée.</p>}
    </section>
  );
}
