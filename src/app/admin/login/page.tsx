"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { fetcher } from "@/lib/client/fetcher";

export default function AdminLogin() {
  const router = useRouter();
  const [v, setV] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <form className="a-card w-full max-w-sm space-y-4 p-8" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try { await fetcher("/api/admin/login", { method: "POST", body: v }); router.push("/admin"); router.refresh(); }
        catch (err) { toast.error((err as Error).message); setBusy(false); }
      }}>
        <h1 className="text-xl font-semibold text-slate-900">Administration</h1>
        <div><label className="a-label">Email</label><input className="a-input" type="email" required autoComplete="username" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
        <div><label className="a-label">Mot de passe</label><input className="a-input" type="password" required autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></div>
        <button className="a-btn-primary w-full" disabled={busy}>{busy ? "…" : "Se connecter"}</button>
      </form>
    </div>
  );
}
