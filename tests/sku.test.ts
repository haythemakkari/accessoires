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

import { stockSettingsSchema } from "@/validation/schemas";
describe("seuil d'alerte de stock", () => {
  it("accepte 1 à 1000 (entiers) et refuse le reste", () => {
    for (const ok of [1, 5, 50, 1000]) expect(stockSettingsSchema.safeParse({ lowStockThreshold: ok }).success, String(ok)).toBe(true);
    for (const bad of [0, -3, 1001, 2.5, "5", null]) expect(stockSettingsSchema.safeParse({ lowStockThreshold: bad }).success, String(bad)).toBe(false);
  });
});

import { heroSettingsSchema } from "@/validation/schemas";
describe("média principal de l'accueil", () => {
  const parse = (o: object) => heroSettingsSchema.safeParse(o);
  const imgs = (n: number) => Array.from({ length: n }, (_, i) => `/uploads/17000-${i}.webp`);
  it("accepte aucun média, un diaporama de 1 à 8 photos, ou une vidéo", () => {
    expect(parse({ heroMediaType: "none" }).success).toBe(true);
    for (const n of [1, 3, 8]) expect(parse({ heroMediaType: "image", heroImages: imgs(n), heroAlt: "Collection" }).success, `${n} photos`).toBe(true);
    expect(parse({ heroMediaType: "image", heroImages: ["https://exemple.com/a.jpg", "/uploads/b.webp"] }).success).toBe(true);
    expect(parse({ heroMediaType: "video", heroMediaUrl: "/media/video/1700-ab12.mp4", heroPosterUrl: "/uploads/p.webp" }).success).toBe(true);
    expect(parse({ heroMediaType: "video", heroMediaUrl: "https://cdn.exemple.com/clip.webm" }).success).toBe(true);
  });
  it("refuse 0 photo, plus de 8 photos, liens dangereux, vidéo invalide et type inconnu", () => {
    for (const bad of [
      { heroMediaType: "image", heroImages: [] },
      { heroMediaType: "image", heroImages: imgs(9) },
      { heroMediaType: "image", heroImages: ["javascript:alert(1)"] },
      { heroMediaType: "image", heroImages: ["/uploads/a.webp", "/etc/passwd"] },
      { heroMediaType: "video", heroMediaUrl: "/uploads/x.png" },
      { heroMediaType: "video", heroMediaUrl: "/media/video/../../x.mp4" },
      { heroMediaType: "video", heroMediaUrl: "http://exemple.com/clip.mp4" },
      { heroMediaType: "video", heroMediaUrl: "/media/video/a.mp4", heroPosterUrl: "javascript:1" },
      { heroMediaType: "carrousel" },
    ]) expect(parse(bad).success, JSON.stringify(bad)).toBe(false);
  });
  it("ne garde que les champs utiles au type choisi, et l'ordre des photos", () => {
    const none = parse({ heroMediaType: "none", heroMediaUrl: "/media/video/a.mp4", heroImages: imgs(2), heroPosterUrl: "/uploads/b.webp" });
    expect(none.success && [none.data.heroMediaUrl, none.data.heroPosterUrl, none.data.heroImages.length]).toEqual(["", "", 0]);
    const img = parse({ heroMediaType: "image", heroImages: ["/uploads/c.webp", "/uploads/a.webp", "/uploads/b.webp"], heroMediaUrl: "/media/video/a.mp4" });
    expect(img.success && img.data.heroImages).toEqual(["/uploads/c.webp", "/uploads/a.webp", "/uploads/b.webp"]);
    expect(img.success && img.data.heroMediaUrl).toBe("");
    const vid = parse({ heroMediaType: "video", heroMediaUrl: "/media/video/a.mp4", heroImages: imgs(3) });
    expect(vid.success && vid.data.heroImages).toEqual([]);
  });
});
