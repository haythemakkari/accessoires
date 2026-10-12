import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { giftBoxSettingsSchema } from "@/validation/schemas";
import { updateSettings } from "@/services/settings.service";

/** Option « Box cadeau » : activer / désactiver, prix et description. */
export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  return updateSettings(await parseBody(req, giftBoxSettingsSchema));
});
