"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/stores/cart";
import { useUser } from "@/stores/user";
import { useQuote } from "@/lib/client/useQuote";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { formatPrice } from "@/lib/utils";
import { GOVERNORATES } from "@/lib/tunisia";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";
import { CouponBox } from "@/components/shop/CouponBox";
import { Totals } from "@/components/shop/Totals";
import { ProductImage } from "@/components/ui/ProductImage";

const STEPS = ["Vos informations", "Livraison", "Récapitulatif"];
type Form = { fullName: string; phone: string; email: string; line: string; city: string; district: string; notes: string };
const EMPTY: Form = { fullName: "", phone: "", email: "", line: "", city: "", district: "", notes: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, couponCode, clear, setCoupon, setQty, remove } = useCart();
  const user = useUser((s) => s.user);
  const { quote, error, loading } = useQuote();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (user) setF((p) => ({ ...p, fullName: p.fullName || user.name, email: p.email || user.email, phone: p.phone || (user.phone ?? "") }));
  }, [user]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (f.fullName.trim().length < 2) e.fullName = "Nom et prénom requis";
      if (!parseTunisianPhone(f.phone)) e.phone = PHONE_ERROR;
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Email invalide";
    }
    if (s === 1) {
      if (f.line.trim().length < 5) e.line = "Adresse requise";
      if (!(GOVERNORATES as readonly string[]).includes(f.city)) e.city = "Choisissez un gouvernorat";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => validate(step) && setStep(step + 1);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetcher<{ orderNumber: string; total: number }>("/api/orders", {
        method: "POST",
        body: {
          customer: { fullName: f.fullName, phone: f.phone, email: f.email || undefined },
          address: { line: f.line, city: f.city, district: f.district.trim() || undefined, notes: f.notes || undefined },
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, variant: l.variant })),
          couponCode: couponCode ?? undefined,
        },
      });
      try {
        sessionStorage.setItem("accessoires-plus-last-order", JSON.stringify({ ...res, lines, quote, customer: f, at: Date.now() }));
      } catch {}
      clear();
      toast.success("Commande confirmée !", { description: res.orderNumber });
      router.push(`/checkout/success?order=${res.orderNumber}`);
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message);
      if (err.code?.startsWith("COUPON")) setCoupon(null);
      if (err.details) setErrors(Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0]])));
      setBusy(false);
    }
  };

  if (!mounted) return <div className="container-x py-20" />;
  if (lines.length === 0) {
    return <div className="container-x py-24 text-center"><p className="h-display text-3xl">Votre panier est vide</p><Link href="/products" className="btn-primary mt-6">Retour à la boutique</Link></div>;
  }

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} value={f[k]} onChange={set(k)} className={`input ${errors[k] ? "!border-rose-400" : ""}`} {...props} />
      {errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="container-x py-10">
      <h1 className="h-display text-4xl">Commande</h1>
      <ol className="mt-6 flex items-center gap-3 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i < step ? "bg-brass text-white" : i === step ? "bg-ink text-sand-50" : "bg-sand-200 text-ink/60"}`}>{i < step ? <Check size={14} /> : i + 1}</span>
            <span className={`hidden sm:inline ${i === step ? "font-medium" : "text-ink/60"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-8 bg-ink/15" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="card p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="h-display text-2xl">Vos informations</h2>
              {!user && <p className="rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink/70">Pas besoin de compte pour commander. <Link href="/login?next=/checkout" className="font-medium underline">Se connecter</Link> pour utiliser votre code de bienvenue.</p>}
              {field("fullName", "Nom et prénom", { autoComplete: "name" })}
              {field("phone", "Téléphone", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "20 123 456" })}
              {field("email", "Email (optionnel)", { type: "email", autoComplete: "email" })}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="h-display text-2xl">Adresse de livraison</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="city">Gouvernorat</label>
                  <select id="city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={`input ${errors.city ? "!border-rose-400" : ""}`} autoComplete="address-level1">
                    <option value="">Choisir un gouvernorat…</option>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
                </div>
                {field("district", "Ville / Délégation (optionnel)", { autoComplete: "address-level2", placeholder: "Ex. La Marsa" })}
              </div>
              {field("line", "Adresse", { autoComplete: "street-address" })}
              <div>
                <label className="label" htmlFor="notes">Informations complémentaires</label>
                <textarea id="notes" rows={3} value={f.notes} onChange={set("notes")} className="input" placeholder="Étage, repère, horaire préféré…" />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="h-display text-2xl">Récapitulatif</h2>
              <ul className="divide-y divide-ink/10 text-sm">
                {lines.map((l) => (
                  <li key={l.key} className="flex justify-between py-3"><span>{l.quantity} × {l.name}{l.variant && <span className="text-ink/60"> ({l.variant})</span>}</span><span>{formatPrice(l.price * l.quantity)}</span></li>
                ))}
              </ul>
              <div className="grid gap-4 rounded-xl bg-sand-100 p-4 text-sm sm:grid-cols-2">
                <div><p className="label">Contact</p>{f.fullName}<br />{f.phone}{f.email && <><br />{f.email}</>}</div>
                <div><p className="label">Livraison</p>{f.line}<br />{[f.district.trim(), f.city].filter(Boolean).join(", ")}</div>
              </div>
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <p className="text-sm text-ink/60">Paiement en espèces à la livraison.</p>
            </div>
          )}
          <div className="mt-8 flex justify-between gap-3">
            {step > 0 ? <button onClick={() => setStep(step - 1)} className="btn-outline">Retour</button> : <Link href="/cart" className="btn-outline">Panier</Link>}
            {step < 2 ? (
              <button onClick={next} className="btn-primary">Continuer</button>
            ) : (
              <button onClick={submit} disabled={busy || !!error || loading || !quote} className="btn-primary">{busy ? "Validation…" : `Confirmer la commande${quote ? ` · ${formatPrice(quote.total)}` : ""}`}</button>
            )}
          </div>
        </div>
        <aside className="card h-fit overflow-hidden lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
            <h2 className="h-display text-xl">Votre commande</h2>
            <Link href="/products" className="text-sm font-semibold text-brass-dark hover:underline">Continuer mes achats</Link>
          </div>
          <ul className="divide-y divide-ink/10 px-5">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-4">
                <Link href={`/products/${l.slug}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand-100"><ProductImage src={l.image} alt={l.name} sizes="64px" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${l.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-brass-dark">{l.name}</Link>
                      {l.variant && <p className="mt-0.5 text-xs text-ink/60">{l.variant}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-emerald-800">{formatPrice(l.price * l.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-2">
                    <div className="flex items-center rounded-full border border-ink/20">
                      <button type="button" className="p-2 disabled:opacity-30" disabled={l.quantity <= 1} onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Diminuer la quantité"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                      <button type="button" className="p-2 disabled:opacity-30" disabled={l.quantity >= l.stock} onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Augmenter la quantité"><Plus size={14} /></button>
                    </div>
                    <button type="button" onClick={() => remove(l.key)} className="p-2 text-ink/50 hover:text-clay" aria-label={`Retirer ${l.name}`}><Trash2 size={17} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-ink/10 px-5 py-4"><CouponBox /></div>
          <div className="border-t border-ink/10 bg-sand-50/60 px-5 py-4"><Totals quote={quote} loading={loading} /></div>
        </aside>
      </div>
    </div>
  );
}
