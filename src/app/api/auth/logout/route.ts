import { api, assertSameOrigin } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  await clearSessionCookie();
  return { ok: true };
});
