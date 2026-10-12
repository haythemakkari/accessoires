import { describe, expect, it } from "vitest";
import { resolveContactPhones, phoneDigits, MAX_CONTACT_PHONES } from "@/lib/contact-phones";
import { contactSettingsSchema } from "@/validation/schemas";

const base = { contactEmail: "", contactAddress: "", contactHours: "" };
const parse = (extra: object) => contactSettingsSchema.safeParse({ ...base, ...extra });

describe("numéros de téléphone : lecture des réglages", () => {
  it("ancien réglage (un seul numéro) : il devient la liste, et reste le numéro WhatsApp comme avant", () => {
    expect(resolveContactPhones({ contactPhone: "+21671234567" })).toEqual({ phones: ["+21671234567"], primary: "+21671234567", whatsapp: "+21671234567" });
  });
  it("plusieurs numéros, WhatsApp choisi : c'est ce numéro-là", () => {
    const r = resolveContactPhones({ contactPhones: ["+21671111111", "+21622222222", "+21655555555"], whatsappPhone: "+21655555555" });
    expect(r).toMatchObject({ primary: "+21671111111", whatsapp: "+21655555555" });
    expect(r.phones).toHaveLength(3);
  });
  it("WhatsApp jamais choisi : le 1ᵉʳ numéro ; explicitement « aucun » : pas de WhatsApp", () => {
    expect(resolveContactPhones({ contactPhones: ["+21671111111", "+21622222222"] }).whatsapp).toBe("+21671111111");
    expect(resolveContactPhones({ contactPhones: ["+21671111111"], whatsappPhone: "" }).whatsapp).toBe("");
  });
  it("numéro WhatsApp qui n'est plus dans la liste : ignoré (aucun bouton WhatsApp)", () => {
    expect(resolveContactPhones({ contactPhones: ["+21671111111"], whatsappPhone: "+21699999999" }).whatsapp).toBe("");
  });
  it("aucun numéro : tout est vide", () => {
    expect(resolveContactPhones({})).toEqual({ phones: [], primary: "", whatsapp: "" });
  });
  it("chiffres seuls pour wa.me / tel", () => { expect(phoneDigits("+216 20 123 456")).toBe("21620123456"); });
});

describe("numéros de téléphone : saisie admin", () => {
  it("normalise chaque numéro, garde l'ordre, le 1ᵉʳ devient le principal", () => {
    const r = parse({ contactPhones: ["20 123 456", "71 234 567"], whatsappPhone: "" });
    expect(r.success && r.data.contactPhones).toEqual(["+21620123456", "+21671234567"]);
    expect(r.success && r.data.contactPhone).toBe("+21620123456");
  });
  it("le numéro WhatsApp est l'un des numéros (saisi sous n'importe quelle forme) ; vide = aucun", () => {
    const r = parse({ contactPhones: ["20 123 456", "71 234 567"], whatsappPhone: "71234567" });
    expect(r.success && r.data.whatsappPhone).toBe("+21671234567");
    const none = parse({ contactPhones: ["20123456"], whatsappPhone: "" });
    expect(none.success && none.data.whatsappPhone).toBe("");
  });
  it("refuse : numéro invalide, doublon, WhatsApp hors liste, trop de numéros", () => {
    expect(parse({ contactPhones: ["20123456", "abc"] }).success).toBe(false);
    expect(parse({ contactPhones: ["20123456", "+216 20 123 456"] }).success).toBe(false);
    expect(parse({ contactPhones: ["20123456"], whatsappPhone: "21222333" }).success).toBe(false);
    expect(parse({ contactPhones: Array.from({ length: MAX_CONTACT_PHONES + 1 }, (_, i) => `2012345${i}`) }).success).toBe(false);
  });
  it("liste vide acceptée (la carte téléphone n'est alors pas affichée)", () => {
    const r = parse({});
    expect(r.success && r.data.contactPhones).toEqual([]);
    expect(r.success && r.data.contactPhone).toBe("");
  });
});
