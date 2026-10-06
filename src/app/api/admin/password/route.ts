import { api, assertSameOrigin, parseBody } from "@/lib/api";
import { hashPassword, requireAdmin, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { adminChangePasswordSchema } from "@/validation/password";

export const PUT = api(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin();
  const { currentPassword, newPassword } = await parseBody(req, adminChangePasswordSchema);
  rateLimit(`admin-pwd:${me.id}`, 5, 15 * 60 * 1000); // ne compte que les vraies tentatives (format valide)
  const user = await User.findById(me._id).select("+passwordHash");
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) throw new AppError("Mot de passe actuel incorrect", 422, "BAD_PASSWORD");
  if (currentPassword === newPassword) throw new AppError("Le nouveau mot de passe doit être différent de l'actuel", 422, "SAME_PASSWORD");
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // déconnecte toutes les autres sessions de cet admin
  await user.save();
  await setSessionCookie(await signSession(user)); // la session courante reste valide
  return { ok: true };
});
