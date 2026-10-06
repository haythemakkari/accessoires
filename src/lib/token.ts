import { SignJWT, jwtVerify } from "jose";

/** Fonctions JWT sans dépendance Node/Mongoose : utilisables dans le middleware (Edge). */
export const SESSION_COOKIE = "accessoires_plus_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type Session = { sub: string; role: "customer" | "admin"; tv: number };

const key = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET manquant ou trop court (min 32 caractères)");
  return new TextEncoder().encode(s);
};

export function signToken(userId: string, role: Session["role"], tv: number) {
  return new SignJWT({ role, tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function readToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { sub: String(payload.sub), role: payload.role as Session["role"], tv: Number(payload.tv ?? 0) };
  } catch {
    return null;
  }
}
