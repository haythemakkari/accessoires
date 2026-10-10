import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { setSessionCookie, signSession } from "@/lib/auth";
import { GOOGLE_COOKIE, GoogleAuthError, exchangeGoogleCode, googleEnabled, readGoogleCookie, sameSecret, verifyGoogleIdToken } from "@/lib/google-oauth";
import { signInWithGoogle } from "@/services/auth.service";

const back = (reason: string) => {
  const res = NextResponse.redirect(new URL(`/login?google=${reason}`, env.siteUrl));
  res.headers.set("Cache-Control", "no-store");
  return res;
};

/** Retour de Google : vérifie state, échange le code (PKCE), contrôle l'id_token, puis connecte ou crée le compte client. */
export async function GET(req: Request) {
  const jar = await cookies();
  const saved = await readGoogleCookie(jar.get(GOOGLE_COOKIE)?.value);
  jar.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" }); // usage unique
  if (!googleEnabled()) return back("disabled");

  const sp = new URL(req.url).searchParams;
  if (sp.get("error")) return back(sp.get("error") === "access_denied" ? "cancelled" : "failed"); // le client a refusé / fermé la fenêtre Google
  const code = sp.get("code");
  const state = sp.get("state");
  if (!saved || !code || !state || !sameSecret(state, saved.state)) return back("failed"); // session expirée, lien rejoué ou forgé

  try {
    rateLimit(`google-cb:${clientIp(req)}`, 20, 10 * 60 * 1000);
    const profile = await verifyGoogleIdToken(await exchangeGoogleCode(code, saved.verifier), saved.nonce);
    await connectDB();
    const { user, created } = await signInWithGoogle(profile, clientIp(req));
    await setSessionCookie(await signSession(user));
    const res = NextResponse.redirect(new URL(saved.next, env.siteUrl));
    res.cookies.set("ap_google_welcome", created ? "new" : "back", { maxAge: 60, path: "/", sameSite: "lax" }); // message d'accueil (lu puis effacé par le navigateur)
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    if (e instanceof GoogleAuthError) return back(e.code === "unverified" ? "unverified" : "failed");
    if (e instanceof AppError) return back(e.code === "GOOGLE_ADMIN" ? "admin" : e.code === "ACCOUNT_DISABLED" ? "disabled_account" : e.code === "SIGNUP_LIMIT" || e.status === 429 ? "limit" : "failed");
    console.error("[google-auth]", e);
    return back("failed");
  }
}
