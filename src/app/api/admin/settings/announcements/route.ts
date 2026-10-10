import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { announcementsSchema } from "@/validation/schemas";
import { updateSettings } from "@/services/settings.service";

/** Messages personnalisés de la barre d'annonces (en haut du site). */
export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  return updateSettings(await parseBody(req, announcementsSchema));
});
