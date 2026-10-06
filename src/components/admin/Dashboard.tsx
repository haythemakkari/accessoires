"use client";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetcher } from "@/lib/client/fetcher";
import { formatPrice } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/status";

type Stats = {
  revenue: number; orders: number; status: Record<string, number>; products: number; outOfStock: number; customers: number; couponsUsed: number;
  daily: { date: string; revenue: number; orders: number }[]; monthly: { month: string; revenue: number; orders: number }[]; top: { name: string; sold: number }[];
};

const MARK = "#4f46e5"; // une seule teinte : toutes les séries sont mono-mesure
const GRID = "#e2e8f0";
const AXIS = { fontSize: 11, fill: "#64748b" };

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="a-card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="a-card p-4"><h2 className="mb-3 text-sm font-medium text-slate-700">{title}</h2><div className="h-64">{children}</div></section>;
}

const tip = (fmt: (n: number) => string, name: string) => ({
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 },
  formatter: (v: unknown) => [fmt(Number(v)), name] as [string, string],
});

export function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fetcher<Stats>("/api/admin/stats").then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="text-rose-600">{err}</p>;
  if (!s) return <p className="text-slate-500">Chargement…</p>;

  const day = (d: string) => d.slice(5).split("-").reverse().join("/");
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Chiffre d’affaires" value={formatPrice(s.revenue)} hint="hors commandes annulées" />
        <Tile label="Commandes" value={s.orders} />
        <Tile label="En attente" value={s.status.pending ?? 0} />
        <Tile label="Confirmées" value={s.status.confirmed ?? 0} />
        <Tile label="Livrées" value={s.status.delivered ?? 0} />
        <Tile label="Produits" value={s.products} hint={`${s.outOfStock} en rupture`} />
        <Tile label="Clients" value={s.customers} />
        <Tile label="Coupons utilisés" value={s.couponsUsed} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Ventes par jour (30 derniers jours)">
          <ResponsiveContainer>
            <AreaChart data={s.daily} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={day} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip {...tip(formatPrice, "Ventes")} labelFormatter={(l) => day(String(l))} />
              <Area type="monotone" dataKey="revenue" stroke={MARK} strokeWidth={2} fill={MARK} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Ventes par mois (12 derniers mois)">
          <ResponsiveContainer>
            <BarChart data={s.monthly} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip {...tip(formatPrice, "Ventes")} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="revenue" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Commandes par jour">
          <ResponsiveContainer>
            <BarChart data={s.daily} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tickFormatter={day} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip {...tip((n) => String(n), "Commandes")} labelFormatter={(l) => day(String(l))} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="orders" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Produits les plus vendus">
          {s.top.length === 0 ? <p className="text-sm text-slate-400">Pas encore de ventes.</p> : (
            <ResponsiveContainer>
              <BarChart data={s.top} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip {...tip((n) => `${n} vendus`, "Ventes")} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="sold" fill={MARK} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <section className="a-card p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Commandes par statut</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {Object.entries(STATUS_LABEL).map(([k, l]) => <span key={k} className="text-slate-600">{l} <strong className="ml-1 tabular-nums text-slate-900">{s.status[k] ?? 0}</strong></span>)}
        </div>
      </section>
    </div>
  );
}
