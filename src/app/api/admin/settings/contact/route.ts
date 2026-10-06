import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { contactSettingsSchema } from "@/validation/schemas";
import { updateSettings } from "@/services/settings.service";

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  return updateSettings(await parseBody(req, contactSettingsSchema));
});
