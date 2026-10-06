import { describe, expect, it } from "vitest";
import { adminNewPassword } from "@/validation/password";

const ok = (p: string) => adminNewPassword.safeParse(p).success;

describe("règles du mot de passe admin", () => {
  it("accepte : 14+ car., 2 majuscules, 2 chiffres, 2 spéciaux", () => {
    expect(ok("Exemple@mdp-test15$*")).toBe(false); // 1 seule majuscule
    expect(ok("ExempLe@mdp-test15$*")).toBe(true);
    expect(ok("AB!!12abcdefghi")).toBe(true);
  });
  it("refuse chaque règle non respectée", () => {
    expect(ok("AB!!12abcdefg")).toBe(false); // 13 caractères
    expect(ok("Ab!!12abcdefghi")).toBe(false); // 1 majuscule
    expect(ok("AB!!1abcdefghij")).toBe(false); // 1 chiffre
    expect(ok("AB!12abcdefghij")).toBe(false); // 1 spécial
    expect(ok("ABCDEFGHIJKLMN!!12".slice(0, 13))).toBe(false);
  });
  it("dit précisément ce qui manque", () => {
    const r = adminNewPassword.safeParse("Abcdefghijklmn");
    expect(r.success).toBe(false);
    if (!r.success) {
      const m = r.error.issues[0].message;
      expect(m).toMatch(/2 majuscules/);
      expect(m).toMatch(/2 chiffres/);
      expect(m).toMatch(/2 caractères spéciaux/);
    }
  });
});
