import { describe, expect, it } from "vitest";
import { GOVERNORATES } from "@/lib/tunisia";
import { checkoutSchema } from "@/validation/schemas";

const base = (city: string) => ({
  customer: { fullName: "Test Client", phone: "+21620000000" },
  address: { line: "12 rue des Tests", city },
  items: [{ productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1 }],
});

describe("gouvernorats", () => {
  it("la liste contient exactement les 24 gouvernorats, sans doublon", () => {
    expect(GOVERNORATES).toHaveLength(24);
    expect(new Set(GOVERNORATES).size).toBe(24);
  });
  it("accepte chaque gouvernorat", () => {
    for (const g of GOVERNORATES) expect(checkoutSchema.safeParse(base(g)).success).toBe(true);
  });
  it("refuse une ville hors liste ou un texte libre", () => {
    for (const bad of ["Paris", "tunis", "Tunis ", "", "Sfax; DROP TABLE"]) expect(checkoutSchema.safeParse(base(bad)).success).toBe(false);
  });
  it("la ville / délégation est facultative, nettoyée et limitée à 80 caractères", () => {
    const withDistrict = (district?: string) => ({ ...base("Tunis"), address: { ...base("Tunis").address, district } });
    expect(checkoutSchema.safeParse(withDistrict()).success).toBe(true);
    const r = checkoutSchema.safeParse(withDistrict("  La Marsa  "));
    expect(r.success && r.data.address.district).toBe("La Marsa");
    expect(checkoutSchema.safeParse(withDistrict("x".repeat(81))).success).toBe(false);
  });
});
