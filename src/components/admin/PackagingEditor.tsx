"use client";
import { useState } from "react";
import { Gift, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImages } from "@/lib/client/upload";
import { mediaUrl } from "@/lib/media";
import type { PackagingOption } from "@/lib/packaging";
import { Switch } from "./ui";

/** Option de packaging en cours d'édition (le supplément reste du texte pendant la saisie). `id` = option déjà enregistrée. */
export type PackagingState = { id?: string; name: string; description: string; image: string; price: string; isAvailable: boolean; isDefault: boolean };
export type PackagingForm = { enabled: boolean; options: PackagingState[] };

export const emptyPackaging = (): PackagingForm => ({ enabled: false, options: [] });

export const toPackagingState = (enabled: boolean | undefined, list: PackagingOption[] | undefined): PackagingForm => ({
  enabled: !!enabled,
  options: (list ?? []).map((o) => ({ id: o._id, name: o.name, description: o.description ?? "", image: o.image ?? "", price: String(o.price), isAvailable: o.isAvailable, isDefault: o.isDefault })),
});

export function toPackagingPayload(f: PackagingForm) {
  return {
    packagingEnabled: f.enabled,
    packagings: f.options.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      name: o.name, description: o.description, image: o.image || undefined,
      price: o.price.trim() === "" ? 0 : Number(o.price.replace(",", ".")),
      isAvailable: o.isAvailable, isDefault: o.isDefault && o.isAvailable,
    })),
  };
}

const PRESETS = ["Packaging simple", "Packaging premium", "Emballage cadeau"];

export function PackagingEditor({ value, onChange, error }: { value: PackagingForm; onChange: (v: PackagingForm) => void; error?: string }) {
  const [uploading, setUploading] = useState<number | null>(null);
  const setOpt = (i: number, patch: Partial<PackagingState>) => onChange({ ...value, options: value.options.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  // Une seule option par défaut : en cocher une décoche les autres.
  const setDefault = (i: number, on: boolean) => onChange({ ...value, options: value.options.map((o, k) => ({ ...o, isDefault: k === i ? on : false })) });
  const add = (name = "") => onChange({ ...value, options: [...value.options, { name, description: "", image: "", price: "0", isAvailable: true, isDefault: false }] });
  const upload = async (i: number, files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(i);
    try { const [url] = await uploadImages([files[0]]); setOpt(i, { image: url }); } catch (e) { toast.error((e as Error).message); } finally { setUploading(null); }
  };
  const unused = PRESETS.filter((p) => !value.options.some((o) => o.name.trim().toLowerCase() === p.toLowerCase()));

  return (
    <section className="a-card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium"><Gift size={16} className="text-indigo-600" /> Packaging personnalisé</p>
          <p className="mt-0.5 text-xs text-slate-500">Propose au client des emballages avec un supplément de prix propre à CE produit. Désactivé : le produit se vend normalement, sans choix supplémentaire.</p>
        </div>
        <Switch label="Activer le packaging" checked={value.enabled} onChange={(v) => onChange({ ...value, enabled: v })} />
      </div>

      {value.enabled && (
        <>
          {value.options.length === 0 && <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Aucune option. Ajoutez par exemple « Packaging simple » ou « Packaging premium ».</p>}
          <ul className="space-y-3">
            {value.options.map((o, i) => (
              <li key={o.id ?? `new-${i}`} className={`rounded-xl border p-3 ${o.isAvailable ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex gap-3">
                  <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-indigo-400" title="Image facultative">
                    {o.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(o.image, 160)} alt="" className="h-full w-full object-cover" /> : uploading === i ? <span className="text-[10px]">Envoi…</span> : <ImagePlus size={20} />}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { upload(i, e.target.files); e.target.value = ""; }} />
                    {o.image && <button type="button" onClick={(e) => { e.preventDefault(); setOpt(i, { image: "" }); }} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Retirer l'image"><X size={12} /></button>}
                  </label>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_120px]">
                    <div><label className="a-label">Nom</label><input className="a-input" maxLength={60} placeholder="Ex. Packaging premium" value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} /></div>
                    <div><label className="a-label">Supplément (DT)</label><input className="a-input" inputMode="decimal" value={o.price} onChange={(e) => setOpt(i, { price: e.target.value })} /></div>
                    <div className="sm:col-span-2"><label className="a-label">Description <span className="font-normal text-slate-400">(optionnelle)</span></label><input className="a-input" maxLength={200} value={o.description} onChange={(e) => setOpt(i, { description: e.target.value })} /></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="flex items-center gap-2"><Switch label={`${o.name || "Option"} : disponible`} checked={o.isAvailable} onChange={(v) => setOpt(i, { isAvailable: v, ...(v ? {} : { isDefault: false }) })} />{o.isAvailable ? "Disponible" : "Indisponible"}</span>
                    <label className={`flex items-center gap-2 ${o.isAvailable ? "cursor-pointer" : "opacity-40"}`}><input type="checkbox" className="h-4 w-4 accent-indigo-600" disabled={!o.isAvailable} checked={o.isDefault} onChange={(e) => setDefault(i, e.target.checked)} /> Option par défaut</label>
                  </div>
                  <button type="button" onClick={() => onChange({ ...value, options: value.options.filter((_, k) => k !== i) })} className="flex items-center gap-1 text-rose-600 hover:underline"><Trash2 size={14} /> Supprimer</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="a-btn-ghost" onClick={() => add()} disabled={value.options.length >= 10}><Plus size={15} /> Ajouter une option</button>
            {unused.map((p) => <button key={p} type="button" onClick={() => add(p)} disabled={value.options.length >= 10} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600">+ {p}</button>)}
          </div>
          <p className="text-xs text-slate-500">Seules les options <strong>disponibles</strong> sont proposées au client, qui peut toujours garder l’emballage standard (inclus). L’option par défaut est présélectionnée sur la fiche produit.</p>
        </>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </section>
  );
}
