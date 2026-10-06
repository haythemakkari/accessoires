import { describe, expect, it } from "vitest";
import { formatTunisianPhone, parseTunisianPhone } from "@/lib/phone";
import { checkoutSchema, registerSchema } from "@/validation/schemas";

describe("numéros tunisiens", () => {
  it("accepte les formats usuels et normalise en +216XXXXXXXX", () => {
    for (const ok of ["20123456", "20 123 456", "20.123.456", "20-123-456", "+21620123456", "+216 20 123 456", "0021620123456", "21620123456", "98 765 432", "55123456", "71123456", "41123456", "31123456"])
      expect(parseTunisianPhone(ok), ok).toMatch(/^\+216[234579]\d{7}$/);
    expect(parseTunisianPhone("+216 20 123 456")).toBe("+21620123456");
    expect(parseTunisianPhone("20123456")).toBe("+21620123456");
  });
  it("refuse les numéros invalides", () => {
    for (const bad of ["", "123", "2012345", "201234567", "10123456", "60123456", "80123456", "01123456", "+33612345678", "+21520123456", "abcdefgh", "20 123 45a", "+216 6 123 4567"])
      expect(parseTunisianPhone(bad), bad).toBeNull();
  });
  it("formate pour l'affichage", () => {
    expect(formatTunisianPhone("+21620123456")).toBe("+216 20 123 456");
  });
  it("le schéma de commande normalise le numéro et rejette un numéro étranger", () => {
    const base = (phone: string) => ({ customer: { fullName: "Test Client", phone }, address: { line: "12 rue des Tests", city: "Tunis" }, items: [{ productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1 }] });
    const ok = checkoutSchema.safeParse(base("20 123 456"));
    expect(ok.success && ok.data.customer.phone).toBe("+21620123456");
    expect(checkoutSchema.safeParse(base("+33 6 12 34 56 78")).success).toBe(false);
  });
  it("l'inscription : téléphone optionnel mais validé s'il est fourni", () => {
    const r = (phone?: string) => registerSchema.safeParse({ name: "Alice", email: "a@b.co", password: "Passw0rdOK", phone });
    expect(r().success).toBe(true);
    expect(r("").success).toBe(true);
    expect(r("98765432").success).toBe(true);
    expect(r("12345").success).toBe(false);
  });
});

import { contactMessageSchema, contactSettingsSchema } from "@/validation/schemas";
describe("formulaire de contact", () => {
  const base = { name: "Alice Test", phone: "20 123 456", email: "", subject: "Question", message: "Bonjour, une question sur ma commande." };
  it("accepte un message valide et normalise le téléphone", () => {
    const r = contactMessageSchema.safeParse(base);
    expect(r.success && r.data.phone).toBe("+21620123456");
  });
  it("exige un téléphone ou un email", () => {
    expect(contactMessageSchema.safeParse({ ...base, phone: "", email: "" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, phone: "", email: "a@b.co" }).success).toBe(true);
  });
  it("refuse téléphone étranger, message court, faux numéro de commande et champ piège rempli", () => {
    expect(contactMessageSchema.safeParse({ ...base, phone: "+33612345678" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, message: "court" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, orderNumber: "ABC" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, orderNumber: "nm-261006-abc123" }).success).toBe(true);
  });
  it("coordonnées de la boutique : champs vides acceptés, valeurs invalides refusées", () => {
    expect(contactSettingsSchema.safeParse({ contactEmail: "", contactPhone: "", contactAddress: "", contactHours: "" }).success).toBe(true);
    expect(contactSettingsSchema.safeParse({ contactEmail: "x", contactPhone: "", contactAddress: "", contactHours: "" }).success).toBe(false);
    expect(contactSettingsSchema.safeParse({ contactEmail: "", contactPhone: "12", contactAddress: "", contactHours: "" }).success).toBe(false);
  });
});
