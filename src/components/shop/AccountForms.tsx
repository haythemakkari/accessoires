"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, fetcher } from "@/lib/client/fetcher";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const router = useRouter();
  const [v, setV] = useState({ name, phone });
  const [busy, setBusy] = useState(false);
  return (
    <form className="card max-w-lg space-y-5 p-6" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try { await fetcher("/api/auth/profile", { method: "PUT", body: v }); toast.success("Informations mises à jour"); router.refresh(); }
      catch (err) { toast.error((err as ApiError).message); } finally { setBusy(false); }
    }}>
      <div><label className="label">Email</label><input className="input" value={email} disabled /></div>
      <div><label className="label">Nom complet</label><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></div>
      <div><label className="label">Téléphone</label><input className="input" type="tel" inputMode="tel" placeholder="20 123 456" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
      <button className="btn-primary" disabled={busy}>Enregistrer</button>
    </form>
  );
}

export function PasswordForm() {
  const [v, setV] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form className="card max-w-lg space-y-5 p-6" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try { await fetcher("/api/auth/password", { method: "PUT", body: v }); toast.success("Mot de passe modifié"); setV({ currentPassword: "", newPassword: "" }); }
      catch (err) { toast.error((err as ApiError).message); } finally { setBusy(false); }
    }}>
      <div><label className="label">Mot de passe actuel</label><input type="password" className="input" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} required autoComplete="current-password" /></div>
      <div><label className="label">Nouveau mot de passe</label><input type="password" className="input" value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} required minLength={8} autoComplete="new-password" /></div>
      <button className="btn-primary" disabled={busy}>Modifier</button>
    </form>
  );
}
