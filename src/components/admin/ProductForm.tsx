"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { uploadImages } from "@/lib/client/upload";
import type { CategoryDTO, ProductDTO } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { PageHeader, Switch } from "./ui";
import { VariantEditor, toVariantPayload, toVariantState, type VariantState } from "./VariantEditor";
import { STOCK_CHANGED_EVENT } from "./NotificationBell";

type FormState = {
  name: string; description: string; price: string; compareAtPrice: string; salePrice: string; isOnSale: boolean; category: string;
  gender: "homme" | "femme" | "unisex"; images: string[]; stock: string; sku: string; variants: VariantState[]; isActive: boolean; isFeatured: boolean;
};

const blank: FormState = { name: "", description: "", price: "", compareAtPrice: "", salePrice: "", isOnSale: false, category: "", gender: "unisex", images: [], stock: "0", sku: "", variants: [], isActive: true, isFeatured: false };

const fromProduct = (p: ProductDTO): FormState => ({
  name: p.name, description: p.description, price: String(p.price), compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "", salePrice: p.salePrice != null ? String(p.salePrice) : "",
  isOnSale: p.isOnSale, category: p.category?._id ?? String(p.category ?? ""), gender: p.gender, images: p.images, stock: String(p.stock), sku: p.sku,
  variants: toVariantState(p.variants), isActive: p.isActive, isFeatured: p.isFeatured,
});

export function ProductForm({ product }: { product?: ProductDTO }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(product ? fromProduct(product) : blank);
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => { fetcher<CategoryDTO[]>("/api/admin/categories").then(setCats).catch(() => {}); }, []);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages([...files]);
      setF((p) => ({ ...p, images: [...p.images, ...urls] }));
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  };
  const move = (i: number, d: number) => { const a = [...f.images]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set("images", a); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
    const body = {
      name: f.name, description: f.description, price: num(f.price) ?? 0, compareAtPrice: num(f.compareAtPrice), salePrice: num(f.salePrice), isOnSale: f.isOnSale,
      category: f.category, gender: f.gender, images: f.images, stock: Math.floor(num(f.stock) ?? 0), sku: f.sku, isActive: f.isActive, isFeatured: f.isFeatured,
      variants: toVariantPayload(f.variants),
    };
    try {
      await fetcher(product ? `/api/admin/products/${product._id}` : "/api/admin/products", { method: product ? "PUT" : "POST", body });
      toast.success(product ? "Produit mis à jour" : "Produit créé");
      window.dispatchEvent(new Event(STOCK_CHANGED_EVENT));
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const er = err as ApiError;
      toast.error(er.message);
      if (er.details) setErrors(Object.fromEntries(Object.entries(er.details).map(([k, v]) => [k, v[0]])));
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>;

  return (
    <form onSubmit={submit}>
      <PageHeader title={product ? "Modifier le produit" : "Nouveau produit"}>
        <Link href="/admin/products" className="a-btn-ghost"><ArrowLeft size={15} /> Retour</Link>
        <button className="a-btn-primary" disabled={busy || uploading}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="a-card space-y-4 p-4">
            <div><label className="a-label">Nom</label><input className="a-input" required value={f.name} onChange={(e) => set("name", e.target.value)} />{err("name")}</div>
            <div><label className="a-label">Description</label><textarea className="a-input" rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} />{err("description")}</div>
          </section>
          <section className="a-card space-y-3 p-4">
            <p className="text-sm font-medium">Images <span className="font-normal text-slate-400">· la première est l’image principale</span></p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {f.images.map((src, i) => (
                <div key={src + i} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(src, 320)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">Principale</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => move(i, -1)} className="p-1 text-white" aria-label="Avancer"><ArrowLeft size={14} /></button>
                    {i > 0 && <button type="button" onClick={() => { const a = [...f.images]; [a[0], a[i]] = [a[i], a[0]]; set("images", a); }} className="p-1 text-white" aria-label="Définir comme principale"><Star size={14} /></button>}
                    <button type="button" onClick={() => move(i, 1)} className="p-1 text-white" aria-label="Reculer"><ArrowRight size={14} /></button>
                    <button type="button" onClick={() => set("images", f.images.filter((_, k) => k !== i))} className="p-1 text-rose-300" aria-label="Retirer"><X size={14} /></button>
                  </div>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-400">
                <Plus size={18} />{uploading ? "Envoi…" : "Ajouter"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
            <div className="flex gap-2">
              <input className="a-input" placeholder="…ou coller une URL d’image (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
              <button type="button" className="a-btn-ghost" onClick={() => { if (/^https?:\/\//.test(url)) { set("images", [...f.images, url.trim()]); setUrl(""); } else toast.error("URL invalide"); }}>Ajouter</button>
            </div>
            {err("images")}
          </section>
          <VariantEditor value={f.variants} onChange={(v) => set("variants", v)} productImages={f.images} />
          {err("variants")}
        </div>
        <div className="space-y-4">
          <section className="a-card space-y-4 p-4">
            <div className="flex items-center justify-between text-sm"><span>Actif (visible en boutique)</span><Switch label="Actif" checked={f.isActive} onChange={(v) => set("isActive", v)} /></div>
            <div className="flex items-center justify-between text-sm"><span>Produit en vedette</span><Switch label="Vedette" checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} /></div>
          </section>
          <section className="a-card space-y-4 p-4">
            <div><label className="a-label">Catégorie</label>
              <select className="a-input" required value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Choisir…</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>{err("category")}</div>
            <div><label className="a-label">Genre</label>
              <select className="a-input" value={f.gender} onChange={(e) => set("gender", e.target.value as FormState["gender"])}><option value="unisex">Unisex</option><option value="homme">Homme</option><option value="femme">Femme</option></select></div>
            <div><label className="a-label">SKU <span className="font-normal text-slate-400">(optionnel)</span></label><input className="a-input uppercase" placeholder="Généré automatiquement si vide" value={f.sku} onChange={(e) => set("sku", e.target.value)} />{err("sku")}</div>
            <div><label className="a-label">Stock</label><input className="a-input" type="number" min={0} required value={f.stock} onChange={(e) => set("stock", e.target.value)} />{err("stock")}</div>
          </section>
          <section className="a-card space-y-4 p-4">
            <div><label className="a-label">Prix (DT)</label><input className="a-input" inputMode="decimal" required value={f.price} onChange={(e) => set("price", e.target.value)} />{err("price")}</div>
            <div><label className="a-label">Ancien prix affiché barré (optionnel)</label><input className="a-input" inputMode="decimal" value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} /></div>
            <div className="flex items-center justify-between text-sm"><span>En promotion</span><Switch label="Promotion" checked={f.isOnSale} onChange={(v) => set("isOnSale", v)} /></div>
            {f.isOnSale && <div><label className="a-label">Prix promotionnel (DT)</label><input className="a-input" inputMode="decimal" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value)} />{err("salePrice")}</div>}
          </section>
        </div>
      </div>
    </form>
  );
}
