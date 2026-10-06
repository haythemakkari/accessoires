import { api } from "@/lib/api";
import { getSettings } from "@/services/settings.service";

/** Réglages publics (frais de livraison) pour l'affichage. Les totaux restent calculés côté serveur. */
export const GET = api(async () => getSettings());
