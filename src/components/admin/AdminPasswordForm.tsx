"use client";
import { useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";
import { ADMIN_PASSWORD_RULES } from "@/validation/password";

export function AdminPasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const results = ADMIN_PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(next) }));
  const strongEnough = results.every((r) => r.ok);
  const matches = next.length > 0 && next === confirm;
  const canSubmit = cur.length > 0 && strongEnough && matches && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      await fetcher("/api/admin/password", { method: "PUT", body: { currentPassword: cur, newPassword: next } });
      toast.success("Mot de passe modifié. Les autres sessions ont été déconnectées.");
      setCur(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const type = show ? "text" : "password";
  return (
    <form onSubmit={submit} className="a-card max-w-lg space-y-4 p-5">
      <h2 className="font-medium text-slate-900">Mot de passe administrateur</h2>
      <div><label className="a-label">Mot de passe actuel</label><input className="a-input" type={type} autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
      <div>
        <div className="flex items-center justify-between">
          <label className="a-label">Nouveau mot de passe</label>
          <button type="button" onClick={() => setShow(!show)} className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">{show ? <EyeOff size={14} /> : <Eye size={14} />}{show ? "Masquer" : "Afficher"}</button>
        </div>
        <input className="a-input" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
          {results.map((r) => (
            <li key={r.id} className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-700" : "text-slate-500"}`}>
              {r.ok ? <Check size={13} /> : <Circle size={13} />} {r.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="a-label">Confirmer le nouveau mot de passe</label>
        <input className="a-input" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {confirm.length > 0 && !matches && <p className="mt-1 text-xs text-rose-600">Les mots de passe ne correspondent pas</p>}
      </div>
      <button className="a-btn-primary" disabled={!canSubmit}>{busy ? "Enregistrement…" : "Changer le mot de passe"}</button>
    </form>
  );
}
