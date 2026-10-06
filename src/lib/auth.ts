import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { forbidden, unauthorized } from "./errors";
import { connectDB } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, readToken, signToken } from "./token";
import { User, type UserDoc } from "@/models/User";

export { SESSION_COOKIE };

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const signSession = (user: Pick<UserDoc, "_id" | "role" | "tokenVersion">) =>
  signToken(String(user._id), user.role, user.tokenVersion);

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Retourne l'utilisateur courant (re-vérifié en base : rôle, statut, version du token) ou null. */
export async function getCurrentUser(): Promise<UserDoc | null> {
  const session = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.sub);
  if (!user || !user.isActive || user.tokenVersion !== session.tv) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw forbidden();
  return user;
}
