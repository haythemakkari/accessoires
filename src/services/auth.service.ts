import { randomBytes } from "crypto";
import { User } from "@/models/User";
import { Coupon } from "@/models/Coupon";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import { createWelcomeCoupon } from "./coupon.service";
import { getSettings } from "./settings.service";

export async function registerCustomer(input: { name: string; email: string; password: string; phone?: string }, ip: string) {
  const emailNormalized = normalizeEmail(input.email);
  const phoneNormalized = input.phone ? normalizePhone(input.phone) : undefined;

  // Anti-abus : un seul compte par email normalisé / téléphone, et plafond par IP.
  if (await User.exists({ emailNormalized })) throw new AppError("Un compte existe déjà avec cet email", 409, "EMAIL_TAKEN");
  if (phoneNormalized && (await User.exists({ phoneNormalized })))
    throw new AppError("Un compte existe déjà avec ce numéro", 409, "PHONE_TAKEN");
  await assertSignupQuota(ip);

  let user: InstanceType<typeof User>;
  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      emailNormalized,
      phone: input.phone,
      phoneNormalized,
      passwordHash: await hashPassword(input.password),
      signupIp: ip,
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Un compte existe déjà avec ces informations", 409, "DUPLICATE");
    throw e;
  }
  await grantWelcomeCoupon(user);
  return user;
}

/** Plafond d'inscriptions par IP sur 24 h (même règle pour l'inscription classique et Google). */
async function assertSignupQuota(ip: string) {
  if (ip === "unknown") return;
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  if ((await User.countDocuments({ signupIp: ip, createdAt: { $gte: since } })) >= env.maxSignupsPerIp)
    throw new AppError("Trop d'inscriptions depuis cette adresse, réessayez plus tard", 429, "SIGNUP_LIMIT");
}

async function grantWelcomeCoupon(user: InstanceType<typeof User>) {
  try {
    // Pourcentage lu en base à chaque inscription ; 0 = pas de code de bienvenue.
    const { welcomeDiscountPercent } = await getSettings();
    if (welcomeDiscountPercent > 0) {
      const welcome = await createWelcomeCoupon(user._id, welcomeDiscountPercent);
      user.welcomeCouponCode = welcome.code;
      await user.save();
    }
  } catch (e) {
    await User.deleteOne({ _id: user._id }); // pas de compte sans coupon : on annule
    throw e;
  }
}

export type GoogleProfile = { sub: string; email: string; name: string };

/**
 * Connexion / inscription avec Google (l'email a déjà été vérifié par Google).
 *  - compte déjà relié à ce Google → connexion ;
 *  - même email qu'un compte client existant → on relie ce Google à ce compte (aucun doublon) ;
 *  - sinon → nouveau compte client (mêmes règles anti-abus que l'inscription : email normalisé unique, plafond par IP, code de bienvenue).
 * Un compte administrateur ne se connecte jamais via Google, ni un compte désactivé.
 */
export async function signInWithGoogle(profile: GoogleProfile, ip: string) {
  const emailNormalized = normalizeEmail(profile.email);
  let user = (await User.findOne({ googleId: profile.sub })) ?? (await User.findOne({ emailNormalized }));
  if (user) {
    if (user.role === "admin") throw new AppError("Les comptes administrateur se connectent avec leur mot de passe", 403, "GOOGLE_ADMIN");
    if (!user.isActive) throw new AppError("Ce compte est désactivé", 403, "ACCOUNT_DISABLED");
    if (user.googleId && user.googleId !== profile.sub) throw new AppError("Ce compte est relié à un autre compte Google", 409, "GOOGLE_MISMATCH");
    if (!user.googleId) { user.googleId = profile.sub; await user.save(); }
    return { user, created: false };
  }
  await assertSignupQuota(ip);
  try {
    user = await User.create({
      name: profile.name.trim().slice(0, 100) || profile.email.split("@")[0],
      email: profile.email,
      emailNormalized,
      googleId: profile.sub,
      passwordSet: false,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")), // inutilisable : aucun mot de passe n'est connu
      signupIp: ip,
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new AppError("Un compte existe déjà avec ces informations", 409, "DUPLICATE");
    throw e;
  }
  await grantWelcomeCoupon(user);
  return { user, created: true };
}

// Hash factice pour égaliser le temps de réponse quand l'email n'existe pas.
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5YpUQXkTz5q9v9m5l5m6o1hQ0mQn3yK";

export async function authenticate(email: string, password: string) {
  const user = await User.findOne({ emailNormalized: normalizeEmail(email) }).select("+passwordHash");
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new AppError("Email ou mot de passe incorrect", 401, "BAD_CREDENTIALS");
  return user;
}

export const getWelcomeCoupon = (userId: string) => Coupon.findOne({ allowedUsers: { $in: [userId] }, kind: "welcome" });
