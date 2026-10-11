"use client";
import { useEffect, useState } from "react";

/** Heure courante, rafraîchie chaque seconde, disponible seulement après l'affichage dans le navigateur (évite tout écart serveur / navigateur). */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** « 2 j 03 h 12 min 05 s » : compte à rebours jusqu'à `to`. À zéro : `doneText`. */
export function Countdown({ to, className = "", doneText = "C'est maintenant !" }: { to: string; className?: string; doneText?: string }) {
  const now = useNow();
  if (now === null) return <span className={className}>&nbsp;</span>;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={className}>{doneText}</span>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (
    <time dateTime={to} className={`tabular-nums ${className}`} aria-label={`Dans ${d} jours, ${h} heures et ${m} minutes`}>
      {d > 0 && <>{d} j </>}{pad(h)} h {pad(m)} min {pad(sec)} s
    </time>
  );
}

/** Date et heure de début de la promotion (formatées dans le fuseau du visiteur, après affichage). */
export function SaleStartText({ startsAt, className = "" }: { startsAt: string; className?: string }) {
  const now = useNow(60_000);
  if (now === null) return <span className={className}>&nbsp;</span>;
  const d = new Date(startsAt);
  return <span className={className}>{d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>;
}
