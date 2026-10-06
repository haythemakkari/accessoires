"use client";
import { useCallback, useEffect, useState } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
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
  const [del, setDel] = useState<M | null>(null);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page) });
    if (unreadOnly) sp.set("unread", "true");
    try { setData(await fetcher<Res>(`/api/admin/messages?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [page, unreadOnly]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(1), [unreadOnly]);

  const setRead = async (m: M, isRead: boolean) => {
    try { await fetcher(`/api/admin/messages/${m._id}`, { method: "PATCH", body: { isRead } }); load(); } catch (e) { toast.error((e as Error).message); }
  };
  const toggle = (m: M) => {
    setOpen(open === m._id ? null : m._id);
    if (!m.isRead) setRead(m, true);
  };

  return (
    <>
      <PageHeader title={`Messages${data?.unread ? ` (${data.unread} non lu${data.unread > 1 ? "s" : ""})` : ""}`}>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Non lus uniquement</label>
      </PageHeader>
      <div className="a-card overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {data?.items.map((m) => (
            <li key={m._id}>
              <button onClick={() => toggle(m)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${m.isRead ? "" : "bg-indigo-50/50"}`}>
                {m.isRead ? <MailOpen size={18} className="mt-0.5 shrink-0 text-slate-400" /> : <Mail size={18} className="mt-0.5 shrink-0 text-indigo-600" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><p className={`truncate text-sm ${m.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{m.name} · {m.subject}</p><span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span></div>
                  {open !== m._id && <p className="truncate text-sm text-slate-500">{m.message}</p>}
                </div>
              </button>
              {open === m._id && (
                <div className="space-y-3 border-t border-slate-100 bg-white px-4 py-4 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{m.message}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
                    {m.phone && <span>📞 <a href={`tel:${m.phone}`} className="underline">{formatTunisianPhone(m.phone)}</a></span>}
                    {m.email && <span>✉️ <a href={`mailto:${m.email}`} className="underline">{m.email}</a></span>}
                    {m.orderNumber && <span>Commande <span className="font-mono">{m.orderNumber}</span></span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="a-btn-ghost" onClick={() => setRead(m, false)}>Marquer comme non lu</button>
                    <button className="a-btn-ghost text-rose-600" onClick={() => setDel(m)}><Trash2 size={15} /> Supprimer</button>
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
      <ConfirmDialog open={!!del} title="Supprimer le message" message={`Supprimer définitivement le message de ${del?.name} ?`} onClose={() => setDel(null)}
        onConfirm={async () => { try { await fetcher(`/api/admin/messages/${del!._id}`, { method: "DELETE" }); toast.success("Message supprimé"); setDel(null); load(); } catch (e) { toast.error((e as Error).message); } }} />
    </>
  );
}
