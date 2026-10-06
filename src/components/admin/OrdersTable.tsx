"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { formatDate, formatPrice } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader, Pager, useDebounced } from "./ui";

type O = { _id: string; orderNumber: string; isGuest: boolean; customer: { fullName: string; phone: string }; total: number; status: string; createdAt: string };
type Res = { items: O[]; total: number; page: number; pages: number };

export function OrdersTable() {
  const [data, setData] = useState<Res | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [guest, setGuest] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page), limit: "20" });
    if (dq) sp.set("q", dq);
    if (status) sp.set("status", status);
    if (guest) sp.set("guest", guest);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    try { setData(await fetcher<Res>(`/api/admin/orders?${sp}`)); } catch (e) { toast.error((e as Error).message); }
  }, [page, dq, status, guest, from, to]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dq, status, guest, from, to]);

  const changeStatus = async (o: O, s: string) => {
    try { await fetcher(`/api/admin/orders/${o._id}`, { method: "PATCH", body: { status: s } }); toast.success(`Commande ${o.orderNumber} : ${STATUS_LABEL[s]}`); load(); } catch (e) { toast.error((e as Error).message); load(); }
  };

  return (
    <>
      <PageHeader title="Commandes" />
      <div className="a-card overflow-hidden">
        <div className="grid gap-2 border-b border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className="a-input !pl-9" placeholder="N°, client, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="a-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select className="a-input" value={guest} onChange={(e) => setGuest(e.target.value)}><option value="">Invités + comptes</option><option value="false">Comptes clients</option><option value="true">Invités</option></select>
          <input type="date" className="a-input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" />
          <input type="date" className="a-input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-2.5">Commande</th><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Téléphone</th><th className="px-4 py-2.5">Total</th><th className="px-4 py-2.5">Statut</th><th className="px-4 py-2.5">Date</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-2.5">{o.customer.fullName}{o.isGuest && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Invité</span>}</td>
                  <td className="px-4 py-2.5 text-slate-600">{o.customer.phone}</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPrice(o.total)}</td>
                  <td className="px-4 py-2.5">
                    <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className="a-input !w-auto !py-1 text-xs" aria-label="Statut">
                      {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right"><Link href={`/admin/orders/${o._id}`} className="a-btn-ghost">Détails</Link></td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Aucune commande</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </div>
    </>
  );
}

export { StatusBadge };
