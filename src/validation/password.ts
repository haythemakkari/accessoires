import { z } from "zod";

/** Règles du mot de passe administrateur. Fichier sans dépendance serveur : partagé avec le navigateur. */
const count = (p: string, re: RegExp) => (p.match(re) ?? []).length;

export const ADMIN_PASSWORD_RULES = [
  { id: "length", label: "14 caractères minimum", test: (p: string) => p.length >= 14 },
  { id: "upper", label: "Au moins 2 majuscules", test: (p: string) => count(p, /[A-Z]/g) >= 2 },
  { id: "digit", label: "Au moins 2 chiffres", test: (p: string) => count(p, /[0-9]/g) >= 2 },
  { id: "special", label: "Au moins 2 caractères spéciaux (! @ # $ % * …)", test: (p: string) => count(p, /[^A-Za-z0-9]/g) >= 2 },
] as const;

export const adminNewPassword = z
  .string()
  .max(128, "128 caractères maximum")
  .superRefine((p, ctx) => {
    const failed = ADMIN_PASSWORD_RULES.filter((r) => !r.test(p));
    if (failed.length) ctx.addIssue({ code: "custom", message: `Mot de passe trop faible : ${failed.map((r) => r.label.toLowerCase()).join(", ")}` });
  });

export const adminChangePasswordSchema = z.object({ currentPassword: z.string().min(1, "Mot de passe actuel requis").max(128), newPassword: adminNewPassword });
