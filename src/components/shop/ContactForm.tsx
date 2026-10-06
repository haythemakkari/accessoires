"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "", orderNumber: "", website: "" };

export function ContactForm() {
  const [v, setV] = useState(EMPTY);
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
    if (v.message.trim().length < 10) err.message = "Message trop court (10 caractères minimum)";
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      await fetcher("/api/contact", { method: "POST", body: v });
      setSent(true);
      setV(EMPTY);
      toast.success("Message envoyé");
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
        <h2 className="h-display mt-3 text-2xl">Merci, votre message est envoyé</h2>
        <p className="mt-2 text-ink/65">Nous vous répondrons dès que possible.</p>
        <button onClick={() => setSent(false)} className="btn-outline mt-6">Envoyer un autre message</button>
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
      <p className="-mt-2 text-xs text-ink/50">Un téléphone ou un email suffit pour que nous puissions vous répondre.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {field("subject", "Objet")}
        {field("orderNumber", "N° de commande (optionnel)", { placeholder: "NM-261006-ABC123", className: "input uppercase" })}
      </div>
      <div>
        <label className="label" htmlFor="c-message">Message</label>
        <textarea id="c-message" rows={4} value={v.message} onChange={set("message")} className={`input ${errors.message ? "!border-rose-400" : ""}`} maxLength={2000} />
        {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
      </div>
      {/* champ piège anti-robots : invisible pour les humains */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Ne pas remplir<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label>
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Envoi…" : "Envoyer le message"}</button>
    </form>
  );
}
