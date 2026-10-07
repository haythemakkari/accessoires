import { describe, expect, it } from "vitest";
import { allOptionImages, imageForChoice, imageForVariantString, optionImage } from "@/lib/variants";
import { productSchema } from "@/validation/schemas";

const variants = [
  { name: "Couleur", options: ["Noir", "Marron", "Cognac"], optionImages: [{ option: "Noir", image: "/uploads/noir.webp" }, { option: "Marron", image: "/uploads/marron.webp" }] },
  { name: "Taille", options: ["S", "M"] },
];

describe("image par couleur", () => {
  it("retrouve l'image de l'option choisie", () => {
    expect(optionImage(variants[0], "Noir")).toBe("/uploads/noir.webp");
    expect(optionImage(variants[0], "Cognac")).toBeUndefined(); // option sans image
    expect(imageForChoice(variants, { Couleur: "Marron", Taille: "M" })).toBe("/uploads/marron.webp");
  });
  it("retourne undefined sans choix, ou si l'option n'a pas d'image (la photo principale reste alors affichée)", () => {
    expect(imageForChoice(variants, {})).toBeUndefined();
    expect(imageForChoice(variants, { Couleur: "Cognac" })).toBeUndefined();
  });
  it("retrouve l'image depuis la chaîne du panier/commande « Noir / M »", () => {
    expect(imageForVariantString(variants, "Noir / M")).toBe("/uploads/noir.webp");
    expect(imageForVariantString(variants, "Marron / S")).toBe("/uploads/marron.webp");
    expect(imageForVariantString(variants, "Cognac / S")).toBeUndefined();
    expect(imageForVariantString(variants, undefined)).toBeUndefined();
  });
  it("liste les images de couleurs sans doublon", () => {
    expect(allOptionImages([...variants, { name: "Motif", options: ["A"], optionImages: [{ option: "A", image: "/uploads/noir.webp" }] }])).toEqual(["/uploads/noir.webp", "/uploads/marron.webp"]);
  });
});

describe("validation des variantes avec images", () => {
  const base = { name: "Sac", price: 10, category: "6ac3d838f2a3ae4b031fbc7d", stock: 1 };
  const withVariants = (v: unknown) => productSchema.safeParse({ ...base, variants: v });
  it("accepte une image par option", () => {
    expect(withVariants([{ name: "Couleur", options: ["Noir", "Marron"], optionImages: [{ option: "Noir", image: "/uploads/a.webp" }, { option: "Marron", image: "https://exemple.com/b.jpg" }] }]).success).toBe(true);
    expect(withVariants([{ name: "Couleur", options: ["Noir"] }]).success).toBe(true); // images facultatives (ancien format)
  });
  it("refuse option inconnue, doublon, lien dangereux, noms d'options identiques", () => {
    expect(withVariants([{ name: "Couleur", options: ["Noir"], optionImages: [{ option: "Rouge", image: "/uploads/a.webp" }] }]).success).toBe(false);
    expect(withVariants([{ name: "Couleur", options: ["Noir"], optionImages: [{ option: "Noir", image: "/uploads/a.webp" }, { option: "Noir", image: "/uploads/b.webp" }] }]).success).toBe(false);
    expect(withVariants([{ name: "Couleur", options: ["Noir"], optionImages: [{ option: "Noir", image: "javascript:alert(1)" }] }]).success).toBe(false);
    expect(withVariants([{ name: "Couleur", options: ["Noir", "Noir"] }]).success).toBe(false);
  });
});
