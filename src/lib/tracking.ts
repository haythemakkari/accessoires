/** Suivi de commande : étapes, messages et calcul de la frise. Fichier pur : navigateur + serveur. */
export const TRACK_STEPS = [
  { key: "pending", label: "Commande passée" },
  { key: "confirmed", label: "Commande confirmée" },
  { key: "processing", label: "En préparation" },
  { key: "shipped", label: "Expédiée" },
  { key: "delivered", label: "Livrée" },
] as const;

export const TRACK_MESSAGE: Record<string, string> = {
  pending: "Nous avons bien reçu votre commande. Nous allons vous appeler pour la confirmer.",
  confirmed: "Votre commande est confirmée.",
  processing: "Votre colis est en cours de préparation.",
  shipped: "Votre colis est en route. Le livreur vous contactera avant de passer.",
  delivered: "Votre colis a été livré. Merci pour votre commande !",
  cancelled: "Cette commande a été annulée. Contactez-nous si vous avez une question.",
};

export type TrackHistory = { status?: string | null; at?: Date | string | null };
export type TimelineStep = { key: string; label: string; state: "done" | "current" | "upcoming" | "cancelled"; at: Date | null; message?: string };

const lastAt = (history: TrackHistory[], status: string): Date | null => {
  const e = history.filter((h) => h.status === status && h.at).map((h) => new Date(h.at!));
  return e.length ? e.reduce((a, b) => (b > a ? b : a)) : null;
};

/**
 * Étapes à afficher, avec leur état et leur date (celle où l'admin a changé le statut).
 *  - étapes passées : « done » ; étape en cours : « current » ; suivantes : « upcoming » ;
 *  - livrée : tout est « done » ; annulée : les étapes atteintes avant l'annulation, puis « Commande annulée » (les suivantes disparaissent).
 */
export function buildTimeline(status: string, history: TrackHistory[], createdAt: Date | string): TimelineStep[] {
  const idx = (s: string) => TRACK_STEPS.findIndex((x) => x.key === s);
  const dateOf = (key: string) => lastAt(history, key) ?? (key === "pending" ? new Date(createdAt) : null);

  if (status === "cancelled") {
    const reached = Math.max(0, ...history.map((h) => idx(h.status ?? "")));
    const steps: TimelineStep[] = TRACK_STEPS.slice(0, reached + 1).map((s) => ({ key: s.key, label: s.label, state: "done", at: dateOf(s.key) }));
    steps.push({ key: "cancelled", label: "Commande annulée", state: "cancelled", at: lastAt(history, "cancelled"), message: TRACK_MESSAGE.cancelled });
    return steps;
  }
  const current = Math.max(0, idx(status));
  return TRACK_STEPS.map((s, i) => {
    const state = status === "delivered" || i < current ? "done" : i === current ? "current" : "upcoming";
    return { key: s.key, label: s.label, state, at: state === "upcoming" ? null : dateOf(s.key), message: state === "current" ? TRACK_MESSAGE[s.key] : undefined };
  });
}
