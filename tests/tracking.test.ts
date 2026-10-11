import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/tracking";

const at = (h: number) => new Date(Date.UTC(2026, 9, 12, h, 0, 0));
const h = (status: string, hour: number) => ({ status, at: at(hour) });
const view = (s: ReturnType<typeof buildTimeline>) => s.map((x) => `${x.key}:${x.state}`);

describe("frise de suivi de commande", () => {
  it("commande reçue : 1ʳᵉ étape en cours (avec sa date), les autres en attente sans date", () => {
    const t = buildTimeline("pending", [h("pending", 8)], at(8));
    expect(view(t)).toEqual(["pending:current", "confirmed:upcoming", "processing:upcoming", "shipped:upcoming", "delivered:upcoming"]);
    expect(t[0].at).toEqual(at(8));
    expect(t.slice(1).every((s) => s.at === null)).toBe(true);
    expect(t[0].message).toMatch(/bien reçu/);
  });
  it("expédiée : les 3 premières validées avec leur date, « Expédiée » en cours, « Livrée » à venir", () => {
    const t = buildTimeline("shipped", [h("pending", 8), h("confirmed", 9), h("processing", 10), h("shipped", 14)], at(8));
    expect(view(t)).toEqual(["pending:done", "confirmed:done", "processing:done", "shipped:current", "delivered:upcoming"]);
    expect(t[3].at).toEqual(at(14));
    expect(t[3].message).toMatch(/en route/);
    expect(t[2].message).toBeUndefined(); // le message n'accompagne que l'étape en cours
  });
  it("livrée : tout est validé, avec la date de livraison", () => {
    const t = buildTimeline("delivered", [h("pending", 8), h("confirmed", 9), h("processing", 10), h("shipped", 11), h("delivered", 15)], at(8));
    expect(t.every((s) => s.state === "done")).toBe(true);
    expect(t[4].at).toEqual(at(15));
  });
  it("étapes sautées par l'admin : elles sont validées sans date", () => {
    const t = buildTimeline("shipped", [h("pending", 8), h("shipped", 12)], at(8));
    expect(view(t).slice(0, 4)).toEqual(["pending:done", "confirmed:done", "processing:done", "shipped:current"]);
    expect(t[1].at).toBeNull();
  });
  it("annulée : étapes atteintes puis « Commande annulée » ; les étapes suivantes disparaissent", () => {
    const t = buildTimeline("cancelled", [h("pending", 8), h("confirmed", 9), h("cancelled", 11)], at(8));
    expect(view(t)).toEqual(["pending:done", "confirmed:done", "cancelled:cancelled"]);
    expect(t[2].at).toEqual(at(11));
    expect(t[2].message).toMatch(/annulée/);
  });
  it("historique vide (ancienne commande) : la date de création sert à la 1ʳᵉ étape", () => {
    const t = buildTimeline("pending", [], at(7));
    expect(t[0].at).toEqual(at(7));
  });
  it("repassée à un statut : la dernière date compte", () => {
    const t = buildTimeline("shipped", [h("pending", 8), h("shipped", 10), h("processing", 11), h("shipped", 16)], at(8));
    expect(t[3].at).toEqual(at(16));
  });
});
