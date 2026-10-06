import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { hashPassword, requireUser, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { changePasswordSchema } from "@/validation/schemas";
import { adminChangePasswordSchema } from "@/validation/password";

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  const me = await requireUser();
  rateLimit(`pwd:${me.id}`, 5, 15 * 60 * 1000);
  const { currentPassword, newPassword } = await parseBody(req, me.role === "admin" ? adminChangePasswordSchema : changePasswordSchema);
  const user = await User.findById(me._id).select("+passwordHash");
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) throw new AppError("Mot de passe actuel incorrect", 422, "BAD_PASSWORD");
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // invalide les autres sessions
  await user.save();
  await setSessionCookie(await signSession(user));
  return { ok: true };
});
