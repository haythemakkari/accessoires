"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";
import { useUser, type ClientUser } from "@/stores/user";

export function AuthForm({ mode, welcomeDiscount }: { mode: "login" | "register"; welcomeDiscount: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const setUser = useUser((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({ name: "", email: "", phone: "", password: "" });
  const register = mode === "register";
  const rawNext = sp.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account"; // anti open-redirect

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetcher<{ user: ClientUser; welcomeCoupon?: string }>(`/api/auth/${mode}`, { method: "POST", body: register ? v : { email: v.email, password: v.password } });
      setUser(res.user);
      if (register) toast.success("Compte créé !", { description: res.welcomeCoupon ? `Votre code de bienvenue : ${res.welcomeCoupon}` : undefined, duration: 8000 });
      else toast.success(`Bon retour, ${res.user.name.split(" ")[0]} !`);
      router.push(next);
      router.refresh();
    } catch (err) {
      const e2 = err as ApiError;
      toast.error(e2.message);
      if (e2.details) setErrors(Object.fromEntries(Object.entries(e2.details).map(([k, m]) => [k, m[0]])));
      setBusy(false);
    }
  };

  const input = (k: keyof typeof v, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={`input ${errors[k] ? "!border-rose-400" : ""}`} {...props} />
      {errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <form onSubmit={submit} className="card w-full max-w-md space-y-5 p-8">
        <div>
          <h1 className="h-display text-3xl">{register ? "Créer un compte" : "Connexion"}</h1>
          {register && welcomeDiscount > 0 && <p className="mt-2 rounded-lg bg-brass/10 px-3 py-2 text-sm text-brass-dark">🎁 Recevez immédiatement un code de <strong>-{welcomeDiscount}%</strong> sur votre première commande.</p>}
        </div>
        {register && input("name", "Nom complet", { required: true, autoComplete: "name" })}
        {input("email", "Email", { type: "email", required: true, autoComplete: "email" })}
        {register && input("phone", "Téléphone (optionnel)", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "20 123 456" })}
        {input("password", "Mot de passe", { type: "password", required: true, minLength: register ? 8 : 1, autoComplete: register ? "new-password" : "current-password" })}
        {register && <p className="-mt-3 text-xs text-ink/50">8 caractères minimum, avec au moins une lettre et un chiffre.</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? "…" : register ? "Créer mon compte" : "Se connecter"}</button>
        <p className="text-center text-sm text-ink/60">
          {register ? <>Déjà client ? <Link href="/login" className="font-medium underline">Se connecter</Link></> : <>Nouveau ici ? <Link href="/register" className="font-medium underline">Créer un compte</Link></>}
        </p>
      </form>
    </div>
  );
}
