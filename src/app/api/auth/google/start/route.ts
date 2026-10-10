import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { GOOGLE_COOKIE, GOOGLE_COOKIE_MAX_AGE, createGoogleRequest, googleEnabled, safeNext } from "@/lib/google-oauth";

/** Début de « Continuer avec Google » : prépare state / nonce / PKCE (cookie httpOnly signé) puis redirige vers Google. */
export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.redirect(new URL(`/login?google=${process.env.NODE_ENV === "production" ? "disabled" : "unconfigured"}`, env.siteUrl));
  try { rateLimit(`google-start:${clientIp(req)}`, 30, 10 * 60 * 1000); } catch { return NextResponse.redirect(new URL("/login?google=limit", env.siteUrl)); }
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const { url, cookie } = await createGoogleRequest(next);
  (await cookies()).set(GOOGLE_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: GOOGLE_COOKIE_MAX_AGE });
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
