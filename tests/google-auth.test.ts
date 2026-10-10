import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { SignJWT, generateKeyPair } from "jose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";

const { connectDB } = await import("@/lib/db");
const { User } = await import("@/models/User");
const { Coupon } = await import("@/models/Coupon");
const { Settings } = await import("@/models/Settings");
const { registerCustomer, signInWithGoogle } = await import("@/services/auth.service");
const g = await import("@/lib/google-oauth");

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([User.init(), Coupon.init()]);
});
beforeEach(async () => { await Promise.all([User.deleteMany({}), Coupon.deleteMany({}), Settings.deleteMany({})]); });
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("Google : PKCE, state et redirections", () => {
  it("challenge PKCE conforme au vecteur de la RFC 7636", () => {
    expect(g.pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("n'accepte que des redirections internes", () => {
    expect(g.safeNext("/account")).toBe("/account");
    expect(g.safeNext("/checkout?x=1")).toBe("/checkout?x=1");
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined]) expect(g.safeNext(bad as string)).toBe("/");
  });
  it("l'URL envoyée à Google contient state, nonce, PKCE S256, openid email profile", async () => {
    const { url, cookie } = await g.createGoogleRequest("/cart");
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/google\/callback$/);
    const saved = await g.readGoogleCookie(cookie);
    expect(saved).toMatchObject({ state: u.searchParams.get("state"), nonce: u.searchParams.get("nonce"), next: "/cart" });
    expect(g.pkceChallenge(saved!.verifier)).toBe(u.searchParams.get("code_challenge"));
    expect(url).not.toContain(saved!.verifier); // le secret PKCE ne quitte jamais le serveur
  });
  it("un cookie falsifié, expiré ou vide est refusé", async () => {
    const { cookie } = await g.createGoogleRequest("/");
    expect(await g.readGoogleCookie(cookie.slice(0, -3) + "abc")).toBeNull();
    expect(await g.readGoogleCookie("n'importe quoi")).toBeNull();
    expect(await g.readGoogleCookie(undefined)).toBeNull();
    const forged = await new SignJWT({ state: "s", nonce: "n", verifier: "v", next: "/" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(new TextEncoder().encode("une-autre-cle-une-autre-cle-une-autre-cle-1"));
    expect(await g.readGoogleCookie(forged)).toBeNull();
    expect(g.sameSecret("abc", "abc")).toBe(true);
    expect(g.sameSecret("abc", "abd")).toBe(false);
    expect(g.sameSecret("abc", "abcd")).toBe(false);
  });
});

describe("Google : vérification de l'id_token", () => {
  const nonce = "nonce-123";
  let privateKey: CryptoKey, publicKey: CryptoKey, otherPrivate: CryptoKey;
  beforeAll(async () => {
    ({ privateKey, publicKey } = await generateKeyPair("RS256"));
    ({ privateKey: otherPrivate } = await generateKeyPair("RS256"));
  });
  const keys = async () => publicKey;
  const token = (claims: Record<string, unknown> = {}, o: { key?: CryptoKey; iss?: string; aud?: string; exp?: string | number } = {}) =>
    new SignJWT({ email: "client@gmail.com", email_verified: true, name: "Client Test", nonce, ...claims })
      .setProtectedHeader({ alg: "RS256" }).setSubject("1234567890").setIssuer(o.iss ?? "https://accounts.google.com").setAudience(o.aud ?? process.env.GOOGLE_CLIENT_ID!)
      .setIssuedAt().setExpirationTime(o.exp ?? "5m").sign(o.key ?? privateKey);

  it("accepte un jeton valide", async () => {
    expect(await g.verifyGoogleIdToken(await token(), nonce, keys)).toEqual({ sub: "1234567890", email: "client@gmail.com", name: "Client Test" });
  });
  it("refuse : mauvaise signature, mauvais émetteur, mauvaise audience, expiré, mauvais nonce", async () => {
    await expect(g.verifyGoogleIdToken(await token({}, { key: otherPrivate }), nonce, keys)).rejects.toMatchObject({ code: "token" });
    await expect(g.verifyGoogleIdToken(await token({}, { iss: "https://evil.example" }), nonce, keys)).rejects.toMatchObject({ code: "token" });
    await expect(g.verifyGoogleIdToken(await token({}, { aud: "autre-client" }), nonce, keys)).rejects.toMatchObject({ code: "token" });
    await expect(g.verifyGoogleIdToken(await token({}, { exp: Math.floor(Date.now() / 1000) - 3600 }), nonce, keys)).rejects.toMatchObject({ code: "token" });
    await expect(g.verifyGoogleIdToken(await token(), "autre-nonce", keys)).rejects.toMatchObject({ code: "token" });
    await expect(g.verifyGoogleIdToken(await token({ nonce: undefined }), nonce, keys)).rejects.toMatchObject({ code: "token" });
  });
  it("refuse un email non vérifié ou absent", async () => {
    await expect(g.verifyGoogleIdToken(await token({ email_verified: false }), nonce, keys)).rejects.toMatchObject({ code: "unverified" });
    await expect(g.verifyGoogleIdToken(await token({ email: undefined }), nonce, keys)).rejects.toMatchObject({ code: "unverified" });
  });
  it("refuse un jeton « alg: none »", async () => {
    const none = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url") + "." + Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, sub: "1", email: "a@b.c", email_verified: true, nonce })).toString("base64url") + ".";
    await expect(g.verifyGoogleIdToken(none, nonce, keys)).rejects.toMatchObject({ code: "token" });
  });
});

describe("Google : compte client", () => {
  const profile = { sub: "g-111", email: "nouveau.client@gmail.com", name: "Nouveau Client" };

  it("crée un compte sans mot de passe, avec code de bienvenue", async () => {
    const { user, created } = await signInWithGoogle(profile, "1.1.1.1");
    expect(created).toBe(true);
    expect(user).toMatchObject({ role: "customer", googleId: "g-111", passwordSet: false, name: "Nouveau Client" });
    expect(user.welcomeCouponCode).toMatch(/^WELCOME-/);
    expect(await Coupon.countDocuments({ allowedUsers: user._id, kind: "welcome" })).toBe(1);
  });
  it("une deuxième connexion retrouve le même compte (pas de doublon, pas de 2ᵉ coupon)", async () => {
    const first = await signInWithGoogle(profile, "1.1.1.1");
    const again = await signInWithGoogle(profile, "1.1.1.1");
    expect(again.created).toBe(false);
    expect(String(again.user._id)).toBe(String(first.user._id));
    expect(await User.countDocuments()).toBe(1);
    expect(await Coupon.countDocuments()).toBe(1);
  });
  it("relie un compte email + mot de passe existant au lieu d'en créer un second", async () => {
    const existing = await registerCustomer({ name: "Ancien", email: "ancien@gmail.com", password: "Motdepasse1" }, "2.2.2.2");
    const { user, created } = await signInWithGoogle({ sub: "g-222", email: "ancien@gmail.com", name: "Autre Nom" }, "3.3.3.3");
    expect(created).toBe(false);
    expect(String(user._id)).toBe(String(existing._id));
    expect(user.googleId).toBe("g-222");
    expect(user.passwordSet).toBe(true); // son mot de passe reste valable
    expect(await User.countDocuments()).toBe(1);
  });
  it("reconnaît l'alias Gmail (points, +tag) : même personne = même compte", async () => {
    await signInWithGoogle({ sub: "g-333", email: "jean.dupont@gmail.com", name: "Jean" }, "4.4.4.4");
    const { created } = await signInWithGoogle({ sub: "g-333", email: "jeandupont@gmail.com", name: "Jean" }, "4.4.4.4");
    expect(created).toBe(false);
    expect(await User.countDocuments()).toBe(1);
  });
  it("refuse un compte administrateur et un compte désactivé", async () => {
    await User.create({ name: "Admin", email: "boss@gmail.com", emailNormalized: "boss@gmail.com", passwordHash: "x", role: "admin" });
    await expect(signInWithGoogle({ sub: "g-444", email: "boss@gmail.com", name: "Boss" }, "5.5.5.5")).rejects.toMatchObject({ code: "GOOGLE_ADMIN" });
    await User.create({ name: "Off", email: "off@gmail.com", emailNormalized: "off@gmail.com", passwordHash: "x", isActive: false });
    await expect(signInWithGoogle({ sub: "g-555", email: "off@gmail.com", name: "Off" }, "5.5.5.5")).rejects.toMatchObject({ code: "ACCOUNT_DISABLED" });
  });
  it("un compte déjà relié à un autre Google est refusé", async () => {
    await signInWithGoogle({ sub: "g-666", email: "dup@gmail.com", name: "Dup" }, "6.6.6.6");
    await expect(signInWithGoogle({ sub: "g-999", email: "dup@gmail.com", name: "Dup" }, "6.6.6.6")).rejects.toMatchObject({ code: "GOOGLE_MISMATCH" });
  });
  it("applique le plafond d'inscriptions par IP", async () => {
    for (let i = 0; i < 3; i++) await signInWithGoogle({ sub: `ip-${i}`, email: `ip${i}@gmail.com`, name: "X" }, "7.7.7.7");
    await expect(signInWithGoogle({ sub: "ip-3", email: "ip3@gmail.com", name: "X" }, "7.7.7.7")).rejects.toMatchObject({ code: "SIGNUP_LIMIT" });
  });
  it("le hash stocké d'un compte Google ne correspond à aucun mot de passe courant", async () => {
    const { user } = await signInWithGoogle(profile, "8.8.8.8");
    const full = await User.findById(user._id).select("+passwordHash");
    const { verifyPassword } = await import("@/lib/auth");
    for (const pw of ["", "password", "Motdepasse1", profile.email]) expect(await verifyPassword(pw, full!.passwordHash)).toBe(false);
  });
});
