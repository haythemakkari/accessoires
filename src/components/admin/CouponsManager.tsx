"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/utils";
import { ConfirmDialog, Modal, PageHeader, Switch } from "./ui";

type C = { _id: string; code: string; type: "percentage" | "fixed"; value: number; startsAt?: string; expiresAt?: string; maxUses?: number; usedCount: number; minOrderAmount: number; isActive: boolean; allowedUsers: string[]; kind: "standard" | "welcome" };
type F = { code: string; type: "percentage" | "fixed"; value: string; startsAt: string; expiresAt: string; maxUses: string; minOrderAmount: string; isActive: boolean };
const empty: F = { code: "", type: "percentage", value: "", startsAt: "", expiresAt: "", maxUses: "", minOrderAmount: "0", isActive: true };
const d = (s?: string) => (s ? s.slice(0, 10) : "");

export function CouponsManager() {
  const [items, setItems] = useState<C[] | null>(null);
  const [kind, setKind] = useState<"standard" | "welcome">("standard");
  const [edit, setEdit] = useState<C | "new" | null>(null);
  const [f, setF] = useState<F>(empty);
  const [del, setDel] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetcher<C[]>(`/api/admin/coupons?kind=${kind}`).then(setItems).catch((e) => toast.error(e.message)), [kind]);
  useEffect(() => { setItems(null); load(); }, [load]);

  const open = (c: C | "new") => {
    setEdit(c);
    setF(c === "new" ? empty : { code: c.code, type: c.type, value: String(c.value), startsAt: d(c.startsAt), expiresAt: d(c.expiresAt), maxUses: c.maxUses != null ? String(c.maxUses) : "", minOrderAmount: String(c.minOrderAmount), isActive: c.isActive });
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const existing = edit !== "new" ? (edit as C) : null;
      const body = { code: f.code, type: f.type, value: Number(f.value), startsAt: f.startsAt || null, expiresAt: f.expiresAt || null, maxUses: f.maxUses ? Number(f.maxUses) : null, minOrderAmount: Number(f.minOrderAmount) || 0, isActive: f.isActive, allowedUsers: existing?.allowedUsers ?? [] };
      await fetcher(existing ? `/api/admin/coupons/${existing._id}` : "/api/admin/coupons", { method: existing ? "PUT" : "POST", body });
      toast.success("Coupon enregistré");
      setEdit(null);
      load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const toggle = async (c: C, isActive: boolean) => { try { await fetcher(`/api/admin/coupons/${c._id}`, { method: "PATCH", body: { isActive } }); load(); } catch (e) { toast.error((e as Error).message); } };

  return (
    <>
      <PageHeader title="Coupons">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["standard", "welcome"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 ${kind === k ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{k === "standard" ? "Coupons" : "Bienvenue (auto)"}</button>)}
        </div>
        {kind === "standard" && <button className="a-btn-primary" onClick={() => open("new")}><Plus size={16} /> Nouveau coupon</button>}
      </PageHeader>
      <div className="a-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-2.5">Code</th><th className="px-4 py-2.5">Valeur</th><th className="px-4 py-2.5">Utilisations</th><th className="px-4 py-2.5">Validité</th><th className="px-4 py-2.5">Min.</th><th className="px-4 py-2.5">Actif</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items?.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono font-medium">{c.code}{c.allowedUsers.length > 0 && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] text-slate-500">réservé</span>}</td>
                <td className="px-4 py-2.5">{c.type === "percentage" ? `${c.value}%` : `${c.value} DT`}</td>
                <td className="px-4 py-2.5 tabular-nums">{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : " / ∞"}</td>
                <td className="px-4 py-2.5 text-slate-500">{c.startsAt ? formatDate(c.startsAt) : "—"} → {c.expiresAt ? formatDate(c.expiresAt) : "∞"}</td>
                <td className="px-4 py-2.5">{c.minOrderAmount ? `${c.minOrderAmount} DT` : "—"}</td>
                <td className="px-4 py-2.5"><Switch label="Actif" checked={c.isActive} onChange={(v) => toggle(c, v)} /></td>
                <td className="px-4 py-2.5 text-right">
                  {c.kind === "standard" && <button className="a-btn-ghost !px-2" onClick={() => open(c)} aria-label="Modifier"><Pencil size={15} /></button>}{" "}
                  <button className="a-btn-ghost !px-2 text-rose-600" onClick={() => setDel(c)} aria-label="Supprimer"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {items?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Aucun coupon</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Nouveau coupon" : "Modifier le coupon"}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="a-label">Code</label><input className="a-input font-mono uppercase" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="SUMMER20" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="a-label">Type</label><select className="a-input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as F["type"] })}><option value="percentage">Pourcentage (%)</option><option value="fixed">Montant fixe (DT)</option></select></div>
            <div><label className="a-label">Valeur</label><input className="a-input" required inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
            <div><label className="a-label">Début</label><input type="date" className="a-input" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></div>
            <div><label className="a-label">Expiration</label><input type="date" className="a-input" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></div>
            <div><label className="a-label">Utilisations max. (vide = illimité)</label><input type="number" min={1} className="a-input" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></div>
            <div><label className="a-label">Montant min. de commande</label><input type="number" min={0} className="a-input" value={f.minOrderAmount} onChange={(e) => setF({ ...f, minOrderAmount: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2 text-sm"><Switch label="Actif" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /> Actif</div>
          <div className="flex justify-end gap-2"><button type="button" className="a-btn-ghost" onClick={() => setEdit(null)}>Annuler</button><button className="a-btn-primary" disabled={busy}>Enregistrer</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Supprimer le coupon" message={`Supprimer le coupon ${del?.code} ? Les commandes déjà passées ne sont pas modifiées.`} onClose={() => setDel(null)}
        onConfirm={async () => { try { await fetcher(`/api/admin/coupons/${del!._id}`, { method: "DELETE" }); toast.success("Coupon supprimé"); setDel(null); load(); } catch (e) { toast.error((e as Error).message); } }} />
    </>
  );
}
