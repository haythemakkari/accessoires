/** Règles des demandes d'échange partagées entre le formulaire (navigateur) et le serveur. */
export const EXCHANGE_WINDOW_DAYS = 7;
export const EXCHANGE_MAX_REPLIES = 100;

type OrderLike = { status: string; statusHistory?: { status?: string | null; at?: Date | string | null }[] | null; updatedAt?: Date | string | null };

/** Date à laquelle l'admin a passé la commande en « livrée » (dernier passage à ce statut). Null si elle n'est pas livrée. */
export function deliveredAt(o: OrderLike): Date | null {
  if (o.status !== "delivered") return null;
  const entries = (o.statusHistory ?? []).filter((h) => h.status === "delivered" && h.at);
  const last = entries.length ? entries.reduce((a, b) => (new Date(b.at!) > new Date(a.at!) ? b : a)) : null;
  const at = last?.at ?? o.updatedAt; // ancienne commande sans historique : date de dernière mise à jour
  return at ? new Date(at) : null;
}

/** Le délai de 7 jours court à partir du moment où l'admin passe la commande en « livrée ». */
export const isWithinExchangeWindow = (from: Date | string | number, now = Date.now()) => now - new Date(from).getTime() <= EXCHANGE_WINDOW_DAYS * 86_400_000;

/** Une commande permet un échange si elle est livrée depuis 7 jours au plus. */
export function isExchangeable(o: OrderLike, now = Date.now()) {
  const d = deliveredAt(o);
  return !!d && isWithinExchangeWindow(d, now);
}
