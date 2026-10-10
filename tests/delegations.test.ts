import { describe, expect, it } from "vitest";
import { GOVERNORATES } from "@/lib/tunisia";
import { DELEGATIONS, delegationsOf } from "@/lib/delegations";

describe("délégations par gouvernorat", () => {
  it("chaque gouvernorat a sa liste, et seulement les 24 gouvernorats", () => {
    expect(Object.keys(DELEGATIONS).sort()).toEqual([...GOVERNORATES].sort());
    for (const g of GOVERNORATES) expect(DELEGATIONS[g].length).toBeGreaterThanOrEqual(5);
  });
  it("aucune valeur vide, avec espaces parasites ou en double dans un gouvernorat", () => {
    for (const g of GOVERNORATES) {
      const list = DELEGATIONS[g];
      for (const d of list) { expect(d.trim()).toBe(d); expect(d.length).toBeGreaterThan(1); expect(d.length).toBeLessThanOrEqual(80); }
      expect(new Set(list.map((d) => d.toLowerCase())).size).toBe(list.length);
    }
  });
  it("renvoie une liste vide pour un gouvernorat inconnu ou vide", () => {
    expect(delegationsOf("")).toEqual([]);
    expect(delegationsOf("Paris")).toEqual([]);
    expect(delegationsOf("Sousse")).toContain("Hergla");
  });
});
