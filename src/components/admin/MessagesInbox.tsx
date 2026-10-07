"use client";
import { useCallback, useEffect, useState } from "react";
import { Mail, MailOpen, MailCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate } from "@/lib/utils";
import { formatTunisianPhone } from "@/lib/phone";
import { ConfirmDialog, PageHeader, Pager } from "./ui";

type M = { _id: string; name: string; phone?: string; email?: string; subject: string; message: string; orderNumber?: string; isRead: boolean; createdAt: string };
type Res = { items: M[]; total: number; unread: number; page: number; pages: number };

export function MessagesInbox() {
  const [data, setData] = useState<Res | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<M[] | null>(null); // messages en attente de confirmation de suppression

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page) });
    if (unreadOnly) sp.set("unread", "true");
    try { setData(await fetcher<Res>(`/api/admin/messages?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [page, unreadOnly]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [unreadOnly]);
  useEffect(() => { setSelected(new Set()); }, [page]);

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((m) => selected.has(m._id));
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((m) => m._id)));

  const setRead = async (ids: string[], isRead: boolean) => {
    try { await fetcher("/api/admin/messages", { method: "PATCH", body: { ids, isRead } }); await load(); } catch (e) { toast.error((e as Error).message); }
  };
  const toggleOpen = (m: M) => { setOpen(open === m._id ? null : m._id); if (!m.isRead) setRead([m._id], true); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const r = await fetcher<{ deleted: number }>("/api/admin/messages", { method: "DELETE", body: { ids: toDelete.map((m) => m._id) } });
      toast.success(r.deleted > 1 ? `${r.deleted} messages supprimés` : "Message supprimé");
      setSelected(new Set());
      setToDelete(null);
      // si la page courante est vidée, on revient en arrière
      if (data && r.deleted >= data.items.length && page > 1) setPage(page - 1); else await load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const picked = items.filter((m) => selected.has(m._id));
  return (
    <>
      <PageHeader title={`Messages${data?.unread ? ` (${data.unread} non lu${data.unread > 1 ? "s" : ""})` : ""}`}>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Non lus uniquement</label>
      </PageHeader>

      <div className="a-card overflow-hidden">
        {/* Barre d'actions : sélection groupée */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
          <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={items.length === 0} aria-label="Tout sélectionner" /> {picked.length > 0 ? `${picked.length} sélectionné${picked.length > 1 ? "s" : ""}` : "Tout sélectionner"}</label>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button className="a-btn-ghost" onClick={() => setRead(picked.map((m) => m._id), true).then(() => setSelected(new Set()))}><MailCheck size={15} /> Marquer comme lus</button>
              <button className="a-btn-danger" onClick={() => setToDelete(picked)}><Trash2 size={15} /> Supprimer ({picked.length})</button>
            </div>
          )}
        </div>

        <ul className="divide-y divide-slate-100">
          {items.map((m) => (
            <li key={m._id} className={selected.has(m._id) ? "bg-indigo-50/60" : ""}>
              <div className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${m.isRead ? "" : "bg-indigo-50/40"}`}>
                <input type="checkbox" className="mt-1" checked={selected.has(m._id)} onChange={() => toggleOne(m._id)} aria-label={`Sélectionner le message de ${m.name}`} />
                <button onClick={() => toggleOpen(m)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={open === m._id}>
                  {m.isRead ? <MailOpen size={18} className="mt-0.5 shrink-0 text-slate-400" /> : <Mail size={18} className="mt-0.5 shrink-0 text-indigo-600" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2"><p className={`truncate text-sm ${m.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{m.name} · {m.subject}</p><span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span></div>
                    {open !== m._id && <p className="truncate text-sm text-slate-500">{m.message}</p>}
                  </div>
                </button>
                <button onClick={() => setToDelete([m])} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Supprimer le message de ${m.name}`} title="Supprimer"><Trash2 size={16} /></button>
              </div>
              {open === m._id && (
                <div className="space-y-3 border-t border-slate-100 bg-white px-4 py-4 pl-11 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{m.message}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                    {m.phone && <span>📞 <a href={`tel:${m.phone}`} className="underline">{formatTunisianPhone(m.phone)}</a></span>}
                    {m.email && <span>✉️ <a href={`mailto:${m.email}`} className="underline">{m.email}</a></span>}
                    {m.orderNumber && <span>Commande <span className="font-mono">{m.orderNumber}</span></span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="a-btn-ghost" onClick={() => setRead([m._id], false)}>Marquer comme non lu</button>
                    <button className="a-btn-ghost text-rose-600" onClick={() => setToDelete([m])}><Trash2 size={15} /> Supprimer</button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {data?.items.length === 0 && <li className="px-4 py-10 text-center text-slate-400">Aucun message</li>}
          {!data && <li className="px-4 py-10 text-center text-slate-400">Chargement…</li>}
        </ul>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete && toDelete.length > 1 ? `Supprimer ${toDelete.length} messages` : "Supprimer le message"}
        message={toDelete && toDelete.length > 1 ? `Supprimer définitivement ces ${toDelete.length} messages ? Cette action est irréversible.` : `Supprimer définitivement le message de ${toDelete?.[0]?.name} ? Cette action est irréversible.`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
