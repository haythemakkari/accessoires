export const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", processing: "En préparation", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};
export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", confirmed: "bg-sky-100 text-sky-800", processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800", delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-rose-100 text-rose-800",
};
