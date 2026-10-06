"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { STATUS_LABEL } from "@/lib/status";
import { ConfirmDialog } from "./ui";

export function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const apply = async (s: string) => {
    try { await fetcher(`/api/admin/orders/${id}`, { method: "PATCH", body: { status: s } }); toast.success(`Statut : ${STATUS_LABEL[s]}`); router.refresh(); } catch (e) { toast.error((e as Error).message); }
    setPending(null);
  };
  return (
    <>
      <select className="a-input !w-auto" value={status} onChange={(e) => (e.target.value === "cancelled" ? setPending("cancelled") : apply(e.target.value))} aria-label="Changer le statut">
        {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <ConfirmDialog open={pending === "cancelled"} title="Annuler la commande" confirmLabel="Annuler la commande" message="Le stock sera remis en vente et le coupon éventuel sera restitué. Cette action est irréversible." onClose={() => setPending(null)} onConfirm={() => apply("cancelled")} />
    </>
  );
}
