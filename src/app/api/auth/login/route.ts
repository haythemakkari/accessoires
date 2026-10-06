import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { assertNotLocked, recordFailure, resetFailures } from "@/lib/rate-limit";
import { loginSchema } from "@/validation/schemas";
import { authenticate } from "@/services/auth.service";
import { setSessionCookie, signSession } from "@/lib/auth";

export const POST = api(async (req) => {
  assertSameOrigin(req);
  const data = await parseBody(req, loginSchema);
  const key = `login:${clientIp(req)}:${data.email.toLowerCase()}`;
  assertNotLocked(key, 8); // seuls les échecs comptent ; un succès remet le compteur à zéro
  try {
    const user = await authenticate(data.email, data.password);
    resetFailures(key);
    await setSessionCookie(await signSession(user));
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  } catch (e) {
    if (e instanceof AppError && e.status === 401) recordFailure(key, 15 * 60 * 1000);
    throw e;
  }
});
