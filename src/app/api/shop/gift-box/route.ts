import { api } from "@/lib/api";
import { getSettings } from "@/services/settings.service";

/** Réglage public de la box cadeau (lu par le panier et la page de commande). Le prix réellement facturé est recalculé par le serveur à chaque devis et commande. */
export const GET = api(async () => {
  const s = await getSettings();
  return { enabled: s.giftBoxEnabled && s.giftBoxPrice >= 0, price: s.giftBoxPrice, description: s.giftBoxDescription };
});
