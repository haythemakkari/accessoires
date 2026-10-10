import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Settings } = await import("@/models/Settings");
const { getSettings, updateSettings } = await import("@/services/settings.service");
const { announcementsSchema } = await import("@/validation/schemas");

beforeAll(async () => { await connectDB(); await mongoose.connection.dropDatabase(); });
beforeEach(async () => { await Settings.deleteMany({}); });
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("barre d'annonces", () => {
  it("par défaut : aucun message personnalisé", async () => {
    expect((await getSettings()).announcements).toEqual([]);
  });
  it("enregistre, relit dans l'ordre et sans toucher aux autres réglages", async () => {
    await updateSettings({ shippingFee: 8, freeShippingThreshold: 120 });
    await updateSettings({ announcements: [{ text: "Soldes d'été", isActive: true }, { text: "Fermé le 13 août", isActive: false }] });
    const s = await getSettings();
    expect(s.announcements).toEqual([{ text: "Soldes d'été", isActive: true }, { text: "Fermé le 13 août", isActive: false }]);
    expect(s.shippingFee).toBe(8);
    expect(s.freeShippingThreshold).toBe(120);
    await updateSettings({ announcements: [] }); // tout supprimer
    expect((await getSettings()).announcements).toEqual([]);
  });
  it("validation : texte nettoyé, non vide, 120 caractères, 5 messages maximum", () => {
    const ok = announcementsSchema.safeParse({ announcements: [{ text: "  Livraison gratuite ce week-end  " }] });
    expect(ok.success && ok.data.announcements[0]).toEqual({ text: "Livraison gratuite ce week-end", isActive: true });
    expect(announcementsSchema.safeParse({ announcements: [{ text: "   " }] }).success).toBe(false);
    expect(announcementsSchema.safeParse({ announcements: [{ text: "x".repeat(121) }] }).success).toBe(false);
    expect(announcementsSchema.safeParse({ announcements: Array.from({ length: 6 }, (_, i) => ({ text: `m${i}` })) }).success).toBe(false);
    expect(announcementsSchema.safeParse({ announcements: [] }).success).toBe(true);
  });
});
