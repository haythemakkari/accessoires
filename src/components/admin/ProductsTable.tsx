"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatPrice } from "@/lib/utils";
import type { CategoryDTO, ProductDTO } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { ConfirmDialog, PageHeader, Pager, Switch, useDebounced } from "./ui";
import { STOCK_CHANGED_EVENT } from "./NotificationBell";

type Res = { items: ProductDTO[]; total: number; page: number; pages: number };

export function ProductsTable() {
  const [data, setData] = useState<Res | null>(null);
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [inStock, setInStock] = useState("");
  const [page, setPage] = useState(1);
  const [del, setDel] = useState<ProductDTO | null>(null);
  const dq = useDebounced(q);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page), limit: "15", sort: "newest" });
    if (dq) sp.set("q", dq);
    if (category) sp.set("category", category);
    if (gender) sp.set("gender", gender);
    if (inStock) sp.set("inStock", inStock);
    try { setData(await fetcher<Res>(`/api/admin/products?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [page, dq, category, gender, inStock]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, category, gender, inStock]);
  useEffect(() => { fetcher<CategoryDTO[]>("/api/admin/categories").then(setCats).catch(() => {}); }, []);

  const patch = async (p: ProductDTO, body: object) => {
    try { await fetcher(`/api/admin/products/${p._id}`, { method: "PATCH", body }); await load(); window.dispatchEvent(new Event(STOCK_CHANGED_EVENT)); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Produits"><Link href="/admin/products/new" className="a-btn-primary"><Plus size={16} /> Nouveau produit</Link></PageHeader>
      <div className="a-card overflow-hidden">
        <div className="grid gap-2 border-b border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className="a-input !pl-9" placeholder="Nom ou SKU…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="a-input" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Toutes catégories</option>{cats.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}</select>
          <select className="a-input" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">Tous genres</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="unisex">Unisex</option></select>
          <select className="a-input" value={inStock} onChange={(e) => setInStock(e.target.value)}><option value="">Tout stock</option><option value="true">En stock</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2.5">Produit</th><th className="px-4 py-2.5">Catégorie</th><th className="px-4 py-2.5">Prix</th><th className="px-4 py-2.5">Stock</th><th className="px-4 py-2.5">Actif</th><th className="px-4 py-2.5">Vedette</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">{p.images[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(p.images[0], 160)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}</div>
                      <div><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.sku}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{p.category?.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p.isOnSale && p.salePrice != null ? <><span className="text-rose-600">{formatPrice(p.salePrice)}</span> <s className="text-xs text-slate-400">{formatPrice(p.price)}</s></> : formatPrice(p.price)}</td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} defaultValue={p.stock} key={p.stock} className={`a-input !w-20 !py-1 ${p.stock === 0 ? "!border-rose-300 bg-rose-50" : ""}`}
                      onBlur={(e) => { const n = Math.max(0, Math.floor(Number(e.target.value))); if (n !== p.stock) patch(p, { stock: n }); }} aria-label="Stock" />
                  </td>
                  <td className="px-4 py-2.5"><Switch label="Actif" checked={p.isActive} onChange={(v) => patch(p, { isActive: v })} /></td>
                  <td className="px-4 py-2.5"><Switch label="Vedette" checked={p.isFeatured} onChange={(v) => patch(p, { isFeatured: v })} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/products/${p._id}`} className="a-btn-ghost !px-2" aria-label="Modifier"><Pencil size={15} /></Link>{" "}
                    <button className="a-btn-ghost !px-2 text-rose-600" onClick={() => setDel(p)} aria-label="Supprimer"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Aucun produit</td></tr>}
              {!data && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
      <ConfirmDialog open={!!del} title="Supprimer le produit" message={`Supprimer définitivement « ${del?.name} » ? Les commandes passées conservent leur historique.`}
        onClose={() => setDel(null)}
        onConfirm={async () => { try { await fetcher(`/api/admin/products/${del!._id}`, { method: "DELETE" }); toast.success("Produit supprimé"); setDel(null); load(); } catch (e) { toast.error((e as Error).message); } }} />
    </>
  );
}
