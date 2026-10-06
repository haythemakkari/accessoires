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
  if (ip !== "unknown") {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    if ((await User.countDocuments({ signupIp: ip, createdAt: { $gte: since } })) >= env.maxSignupsPerIp)
      throw new AppError("Trop d'inscriptions depuis cette adresse, réessayez plus tard", 429, "SIGNUP_LIMIT");
  }

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
  return user;
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
