"use client";
import { useState } from "react";
import { Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { fetcher } from "@/lib/client/fetcher";

export function CouponBox() {
  const { lines, couponCode, setCoupon } = useCart();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      await fetcher("/api/cart/quote", { method: "POST", body: { items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variant: l.variant })), couponCode: c } });
      setCoupon(c);
      setCode("");
      toast.success("Code promo appliqué", { description: c });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (couponCode) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="flex items-center gap-2"><Tag size={16} /> <strong>{couponCode}</strong> appliqué</span>
        <button onClick={() => setCoupon(null)} aria-label="Retirer le code"><X size={16} /></button>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="flex gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code promo" className="input uppercase" aria-label="Code promo" />
      <button disabled={busy || !code.trim()} className="btn-outline !px-5">Appliquer</button>
    </form>
  );
}
