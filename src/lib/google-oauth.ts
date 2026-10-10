import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { env } from "./env";

/**
 * « Continuer avec Google » : OAuth 2.0 / OpenID Connect, flux « authorization code » + PKCE (S256), côté serveur uniquement.
 *  - `state` : lie le retour de Google à CE navigateur (anti-CSRF de connexion) ;
 *  - `nonce` : lie l'id_token à CETTE demande (anti-rejeu) ;
 *  - `code_verifier` : le code ne sert à rien sans le secret gardé dans un cookie httpOnly ;
 *  - l'id_token est vérifié (signature Google, émetteur, audience, expiration, nonce, email vérifié) avant toute connexion.
 */
export const GOOGLE_COOKIE = "ap_google_oauth";
export const GOOGLE_COOKIE_MAX_AGE = 10 * 60; // 10 min pour finir la connexion chez Google
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const googleConfig = () => ({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" });
/** Le bouton n'apparaît que si les identifiants Google sont configurés. */
export const googleEnabled = () => !!(googleConfig().clientId && googleConfig().clientSecret);
/** Bouton visible : en production seulement si Google est configuré ; en développement toujours (pour voir l'interface, avec un message d'aide si les identifiants manquent). */
export const googleButtonVisible = () => googleEnabled() || process.env.NODE_ENV !== "production";
export const googleRedirectUri = () => `${env.siteUrl}/api/auth/google/callback`;

const b64url = (b: Buffer) => b.toString("base64url");
export const pkceChallenge = (verifier: string) => b64url(createHash("sha256").update(verifier).digest());

/** Redirection interne uniquement (anti open-redirect). */
export const safeNext = (v: string | null | undefined) => (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/");

const secretKey = () => new TextEncoder().encode(env.jwtSecret);

export type OAuthState = { state: string; nonce: string; verifier: string; next: string };

/** Nouvelle demande : paramètres secrets (cookie signé) + URL vers laquelle envoyer le client. */
export async function createGoogleRequest(next: string) {
  const st: OAuthState = { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), next: safeNext(next) };
  const cookie = await new SignJWT({ ...st }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${GOOGLE_COOKIE_MAX_AGE}s`).sign(secretKey());
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: googleConfig().clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: st.state,
    nonce: st.nonce,
    code_challenge: pkceChallenge(st.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie };
}

export async function readGoogleCookie(value?: string): Promise<OAuthState | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtVerify(value, secretKey(), { algorithms: ["HS256"] });
    const { state, nonce, verifier, next } = payload as Record<string, unknown>;
    return typeof state === "string" && typeof nonce === "string" && typeof verifier === "string" ? { state, nonce, verifier, next: safeNext(String(next ?? "/")) } : null;
  } catch {
    return null;
  }
}

export const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class GoogleAuthError extends Error {
  constructor(public code: "exchange" | "token" | "unverified", message: string) { super(message); }
}

let jwks: JWTVerifyGetKey | undefined;
const remoteKeys: JWTVerifyGetKey = (h, t) => (jwks ??= createRemoteJWKSet(new URL(JWKS_URL)))(h, t);

/** Vérifie l'id_token de Google et renvoie le profil. `keys` est injectable pour les tests. */
export async function verifyGoogleIdToken(idToken: string, nonce: string, keys: JWTVerifyGetKey = remoteKeys) {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, keys, { issuer: ISSUERS, audience: googleConfig().clientId, algorithms: ["RS256"], clockTolerance: 10 }));
  } catch {
    throw new GoogleAuthError("token", "Jeton Google invalide");
  }
  if (typeof payload.nonce !== "string" || !sameSecret(payload.nonce, nonce)) throw new GoogleAuthError("token", "Jeton Google invalide (nonce)");
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) throw new GoogleAuthError("unverified", "Adresse email Google non vérifiée");
  return { sub: String(payload.sub), email: payload.email, name: typeof payload.name === "string" ? payload.name : "" };
}

/** Échange le code d'autorisation contre l'id_token (appel serveur à serveur avec le secret client + le code_verifier PKCE). */
export async function exchangeGoogleCode(code: string, verifier: string): Promise<string> {
  const { clientId, clientSecret } = googleConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: googleRedirectUri(), grant_type: "authorization_code", code_verifier: verifier }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new GoogleAuthError("exchange", `Échange du code refusé (${res.status})`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new GoogleAuthError("exchange", "Réponse Google sans id_token");
  return data.id_token;
}
