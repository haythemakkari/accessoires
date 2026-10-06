import { api, assertSameOrigin, clientIp, parseBody } from "@/lib/api";
import { assertNotLocked, recordFailure, resetFailures } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/validation/schemas";
import { authenticate } from "@/services/auth.service";
import { setSessionCookie, signSession } from "@/lib/auth";

/** Connexion réservée aux administrateurs : un client reçoit la même erreur qu'un mauvais mot de passe. */
export const POST = api(async (req) => {
  assertSameOrigin(req);
  const data = await parseBody(req, loginSchema);
  const key = `admin-login:${clientIp(req)}:${data.email.toLowerCase()}`;
  assertNotLocked(key, 5);
  try {
    const user = await authenticate(data.email, data.password);
    if (user.role !== "admin") throw new AppError("Email ou mot de passe incorrect", 401, "BAD_CREDENTIALS");
    resetFailures(key);
    await setSessionCookie(await signSession(user));
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError && e.status === 401) recordFailure(key, 15 * 60 * 1000);
    throw e;
  }
});
