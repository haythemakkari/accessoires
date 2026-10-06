import { describe, expect, it } from "vitest";
import { productSchema } from "@/validation/schemas";

const base = { name: "Produit", price: 10, category: "6ac3d838f2a3ae4b031fbc7d", stock: 1 };
describe("SKU facultatif", () => {
  it("accepte l'absence de SKU, un SKU vide ou espaces → undefined (sera généré)", () => {
    for (const sku of [undefined, "", "   "]) {
      const r = productSchema.safeParse({ ...base, sku });
      expect(r.success && r.data.sku).toBeUndefined();
    }
  });
  it("conserve un SKU saisi (nettoyé) et refuse plus de 60 caractères", () => {
    const ok = productSchema.safeParse({ ...base, sku: "  ab-12  " });
    expect(ok.success && ok.data.sku).toBe("ab-12");
    expect(productSchema.safeParse({ ...base, sku: "x".repeat(61) }).success).toBe(false);
  });
});

describe("liens d'images produit", () => {
  const withImages = (images: string[]) => productSchema.safeParse({ name: "Produit", price: 10, category: "6ac3d838f2a3ae4b031fbc7d", stock: 1, images });
  it("accepte les fichiers téléversés et les liens http(s)", () => {
    expect(withImages(["/uploads/1700000000-ab12cd34.jpg", "https://exemple.com/a.png", "http://exemple.com/b.webp"]).success).toBe(true);
  });
  it("refuse javascript:, data:, chemins arbitraires et dossiers parents", () => {
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAAA", "/etc/passwd", "/uploads/../secret.png", "//evil.com/x.png", "ftp://x/y.png", ""]) expect(withImages([bad]).success, bad).toBe(false);
  });
});

import { welcomeSettingsSchema } from "@/validation/schemas";
describe("réglage de la réduction de bienvenue", () => {
  it("accepte 0 à 50 (entiers) et refuse le reste", () => {
    for (const ok of [0, 1, 10, 50]) expect(welcomeSettingsSchema.safeParse({ welcomeDiscountPercent: ok }).success, String(ok)).toBe(true);
    for (const bad of [-1, 51, 100, 10.5, "10", null]) expect(welcomeSettingsSchema.safeParse({ welcomeDiscountPercent: bad }).success, String(bad)).toBe(false);
  });
});
