import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema } from "@/validation/schemas";
import { getSettings, updateSettings } from "@/services/settings.service";

export const GET = api(async () => {
  await requireAdmin();
  return getSettings();
});

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  return updateSettings(await parseBody(req, settingsSchema));
});
