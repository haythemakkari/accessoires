"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { ConfirmDialog, Modal, PageHeader, Switch } from "./ui";

type Cat = { _id: string; name: string; slug: string; description?: string; image?: string; isActive: boolean; sortOrder: number; productCount: number };
const empty = { name: "", description: "", image: "", isActive: true, sortOrder: 0 };

export function CategoriesManager() {
  const [items, setItems] = useState<Cat[] | null>(null);
  const [edit, setEdit] = useState<Cat | "new" | null>(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState<Cat | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetcher<Cat[]>("/api/admin/categories").then(setItems).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const open = (c: Cat | "new") => { setEdit(c); setForm(c === "new" ? empty : { name: c.name, description: c.description ?? "", image: c.image ?? "", isActive: c.isActive, sortOrder: c.sortOrder }); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, description: form.description || undefined, image: form.image || undefined, sortOrder: Number(form.sortOrder) || 0 };
      await fetcher(edit === "new" ? "/api/admin/categories" : `/api/admin/categories/${(edit as Cat)._id}`, { method: edit === "new" ? "POST" : "PUT", body });
      toast.success("Catégorie enregistrée");
      setEdit(null);
      load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const toggle = async (c: Cat, isActive: boolean) => {
    try { await fetcher(`/api/admin/categories/${c._id}`, { method: "PUT", body: { name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder, isActive } }); load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Catégories"><button className="a-btn-primary" onClick={() => open("new")}><Plus size={16} /> Nouvelle catégorie</button></PageHeader>
      <div className="a-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-2.5">Nom</th><th className="px-4 py-2.5">Slug</th><th className="px-4 py-2.5">Produits</th><th className="px-4 py-2.5">Ordre</th><th className="px-4 py-2.5">Active</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items?.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{c.name}</td><td className="px-4 py-2.5 text-slate-500">{c.slug}</td>
                <td className="px-4 py-2.5">{c.productCount}</td><td className="px-4 py-2.5">{c.sortOrder}</td>
                <td className="px-4 py-2.5"><Switch label="Active" checked={c.isActive} onChange={(v) => toggle(c, v)} /></td>
                <td className="px-4 py-2.5 text-right">
                  <button className="a-btn-ghost !px-2" onClick={() => open(c)} aria-label="Modifier"><Pencil size={15} /></button>{" "}
                  <button className="a-btn-ghost !px-2 text-rose-600" onClick={() => setDel(c)} aria-label="Supprimer"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {items?.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Aucune catégorie. Créez-en une pour commencer.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="a-label">Nom</label><input className="a-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="a-label">Description</label><textarea className="a-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="a-label">Image (URL)</label><input className="a-input" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="a-label">Ordre d’affichage</label><input className="a-input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-2 pb-2 text-sm"><Switch label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /> Active</div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="a-btn-ghost" onClick={() => setEdit(null)}>Annuler</button><button className="a-btn-primary" disabled={busy}>Enregistrer</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Supprimer la catégorie" message={`Supprimer « ${del?.name} » ? Impossible si elle contient des produits.`} onClose={() => setDel(null)}
        onConfirm={async () => { try { await fetcher(`/api/admin/categories/${del!._id}`, { method: "DELETE" }); toast.success("Catégorie supprimée"); setDel(null); load(); } catch (e) { toast.error((e as Error).message); setDel(null); } }} />
    </>
  );
}
