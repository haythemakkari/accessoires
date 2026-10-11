"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";
import { useUser } from "@/stores/user";
import { formatDate } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/status";
import { EXCHANGE_WINDOW_DAYS, deliveredAt, isExchangeable } from "@/lib/exchange";

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "", orderNumber: "", website: "" };

type MyOrder = { orderNumber: string; status: string; createdAt: string; updatedAt?: string; statusHistory?: { status: string; at: string }[] };
const EXCHANGE_SUBJECT = "Demande d'échange";

/** kind = « exchange » : demande d'échange (objet déjà rempli, n° de commande obligatoire, suivie dans « Mon compte »). */
export function ContactForm({ kind = "contact" }: { kind?: "contact" | "exchange" }) {
  const exchange = kind === "exchange";
  const user = useUser((s) => s.user);
  const [v, setV] = useState(exchange ? { ...EMPTY, subject: EXCHANGE_SUBJECT } : EMPTY);
  const [orders, setOrders] = useState<MyOrder[] | null>(null); // commandes échangeables du client connecté (null = chargement)
  const member = !!user && user.role === "customer";
  // Client connecté : ses coordonnées sont préremplies (sans écraser une saisie) et il peut choisir sa commande dans une liste.
  useEffect(() => {
    if (!user || user.role !== "customer") return;
    setV((x) => ({ ...x, name: x.name || user.name, email: x.email || user.email, phone: x.phone || user.phone || "" }));
    if (exchange) fetcher<MyOrder[]>("/api/orders").then((l) => setOrders(l.filter((o) => isExchangeable(o)))).catch(() => setOrders([]));
  }, [user, exchange]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (v.name.trim().length < 2) err.name = "Nom requis";
    if (v.phone.trim() && !parseTunisianPhone(v.phone)) err.phone = PHONE_ERROR;
    if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) err.email = "Email invalide";
    if (!v.phone.trim() && !v.email.trim()) err.phone = "Indiquez un téléphone ou un email pour que nous puissions vous répondre";
    if (v.subject.trim().length < 3) err.subject = "Objet requis";
    if (exchange && !v.orderNumber.trim()) err.orderNumber = member ? "Choisissez la commande concernée" : "Indiquez le numéro de la commande concernée";
    if (v.message.trim().length < 10) err.message = "Message trop court (10 caractères minimum)";
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      await fetcher("/api/contact", { method: "POST", body: { ...v, kind } });
      setSent(true);
      setV(exchange ? { ...EMPTY, subject: EXCHANGE_SUBJECT } : EMPTY);
      toast.success(exchange ? "Demande d’échange envoyée" : "Message envoyé");
    } catch (er) {
      const apiErr = er as ApiError;
      toast.error(apiErr.message);
      if (apiErr.details) setErrors(Object.fromEntries(Object.entries(apiErr.details).map(([k, m]) => [k, m[0]])));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={44} strokeWidth={1.5} />
        <h2 className="h-display mt-3 text-2xl">{exchange ? "Votre demande d’échange est envoyée" : "Merci, votre message est envoyé"}</h2>
        <p className="mt-2 text-ink/65">{exchange ? "Nous l’étudions et vous répondons dès que possible." : "Nous vous répondrons dès que possible."}</p>
        {exchange && (user
          ? <p className="mt-2 text-sm text-ink/65">Suivez-la et lisez nos réponses dans <Link href="/account" className="font-medium underline underline-offset-4">Mon compte</Link>.</p>
          : <p className="mt-2 text-sm text-ink/65">Pour suivre votre demande et lire nos réponses en ligne, <Link href="/login?next=/account" className="font-medium underline underline-offset-4">connectez-vous</Link> ou <Link href="/register" className="font-medium underline underline-offset-4">créez un compte</Link>. Nous pouvons aussi vous répondre par téléphone ou par email.</p>)}
        <button onClick={() => setSent(false)} className="btn-outline mt-6">{exchange ? "Faire une autre demande" : "Envoyer un autre message"}</button>
      </div>
    );
  }

  const field = (k: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`c-${k}`}>{label}</label>
      <input id={`c-${k}`} value={v[k]} onChange={set(k)} className={`input ${errors[k] ? "!border-rose-400" : ""}`} {...props} />
      {errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
      {field("name", "Nom et prénom", { autoComplete: "name" })}
      <div className="grid gap-4 lg:grid-cols-2">
        {field("phone", "Téléphone", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "20 123 456" })}
        {field("email", "Email", { type: "email", autoComplete: "email" })}
      </div>
      <p className="-mt-2 text-xs text-ink/60">Un téléphone ou un email suffit pour que nous puissions vous répondre.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {field("subject", "Objet", exchange ? { readOnly: true, className: "input bg-sand-50" } : {})}
        {/* Client connecté : il choisit parmi ses commandes des 7 derniers jours. Visiteur : saisie du numéro. */}
        {exchange && member ? (
          <div>
            <label className="label" htmlFor="c-orderNumber">Commande concernée</label>
            <select id="c-orderNumber" className={`input ${errors.orderNumber ? "!border-rose-400" : ""}`} value={v.orderNumber} disabled={!orders || orders.length === 0} onChange={(e) => setV({ ...v, orderNumber: e.target.value })}>
              <option value="">{orders === null ? "Chargement…" : orders.length === 0 ? "Aucune commande échangeable" : "Choisir une commande…"}</option>
              {orders?.map((o) => <option key={o.orderNumber} value={o.orderNumber}>{o.orderNumber} · livrée le {formatDate(deliveredAt(o)!.toISOString())}</option>)}
            </select>
            {errors.orderNumber && <p className="mt-1 text-xs text-rose-600">{errors.orderNumber}</p>}
          </div>
        ) : field("orderNumber", exchange ? "N° de commande" : "N° de commande (optionnel)", { placeholder: "NM-261006-ABC123", className: `input uppercase ${errors.orderNumber ? "!border-rose-400" : ""}`, required: exchange })}
      </div>
      {exchange && member && orders && orders.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Aucune de vos commandes n’a été livrée ces {EXCHANGE_WINDOW_DAYS} derniers jours : l’échange n’est pas possible pour le moment. Une question ? <Link href="/contact" className="font-medium underline underline-offset-4">Écrivez-nous</Link>.</p>
      )}
      {exchange && member && orders && orders.length > 0 && <p className="-mt-2 text-xs text-ink/60">Seules vos commandes livrées depuis moins de {EXCHANGE_WINDOW_DAYS} jours sont proposées.</p>}
      <div>
        <label className="label" htmlFor="c-message">Message</label>
        <textarea id="c-message" rows={4} placeholder={exchange ? "Quel article souhaitez-vous échanger, et contre quoi (autre taille, autre modèle…) ? Précisez le motif si l’article est défectueux." : undefined} value={v.message} onChange={set("message")} className={`input ${errors.message ? "!border-rose-400" : ""}`} maxLength={2000} />
        {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
      </div>
      {/* champ piège anti-robots : invisible pour les humains */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Ne pas remplir<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label>
      </div>
      <button className="btn-primary" disabled={busy || (exchange && member && orders !== null && orders.length === 0)}>{busy ? "Envoi…" : exchange ? "Envoyer ma demande d’échange" : "Envoyer le message"}</button>
    </form>
  );
}
