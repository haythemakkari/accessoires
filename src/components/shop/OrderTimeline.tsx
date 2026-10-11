import { Check, X } from "lucide-react";
import { buildTimeline, type TrackHistory } from "@/lib/tracking";
import { formatDateTime } from "@/lib/utils";

/** Frise verticale du suivi de commande : étapes validées (avec date et heure), étape en cours, étapes à venir. */
export function OrderTimeline({ status, history, createdAt }: { status: string; history: TrackHistory[]; createdAt: Date | string }) {
  const steps = buildTimeline(status, history, createdAt);
  return (
    <ol aria-label="Suivi de la commande">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const next = steps[i + 1];
        const filled = s.state === "done" && next && next.state !== "upcoming"; // le trait descend en couleur jusqu'à l'étape suivante atteinte
        return (
          <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0" aria-current={s.state === "current" ? "step" : undefined}>
            {!last && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${filled ? (next.state === "cancelled" ? "bg-clay/60" : "bg-ink") : "bg-ink/15"}`} />}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                s.state === "done" ? "bg-ink text-sand-50"
                : s.state === "current" ? "border-2 border-ink bg-white ring-4 ring-ink/10"
                : s.state === "cancelled" ? "bg-clay text-white"
                : "border-2 border-ink/15 bg-sand-100"
              }`}
            >
              {s.state === "done" && <Check size={16} strokeWidth={3} />}
              {s.state === "current" && <span className="h-3 w-3 rounded-full bg-ink" />}
              {s.state === "cancelled" && <X size={16} strokeWidth={3} />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`font-semibold ${s.state === "upcoming" ? "text-ink/45" : s.state === "cancelled" ? "text-clay" : "text-ink"}`}>{s.label}</p>
              <p className="text-sm text-ink/55">{s.at ? formatDateTime(s.at) : s.state === "upcoming" ? "En attente" : s.state === "done" ? "Validée" : ""}</p>
              {s.message && <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${s.state === "cancelled" ? "bg-clay/10 text-clay" : "bg-sand-100 text-ink/80"}`}>{s.message}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
