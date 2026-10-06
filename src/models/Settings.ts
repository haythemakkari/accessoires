import mongoose, { Schema, type InferSchemaType } from "mongoose";

/** Réglages de la boutique : un seul document (key = "shop"). */
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "shop" },
    shippingFee: { type: Number, required: true, min: 0 },
    /** Livraison offerte à partir de ce montant (0 = jamais offerte). */
    freeShippingThreshold: { type: Number, required: true, min: 0 },
    /** Coordonnées affichées sur la page Contact (facultatives). */
    contactEmail: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactAddress: { type: String, trim: true, default: "" },
    contactHours: { type: String, trim: true, default: "" },
    /** Réduction du code de bienvenue, en % (0 = offre désactivée). Ne modifie pas les codes déjà émis. */
    welcomeDiscountPercent: { type: Number, min: 0, max: 50, default: 10 },
    contactEmailNote: { type: String, trim: true, default: "" },
    contactAddressNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export type SettingsData = Pick<InferSchemaType<typeof settingsSchema>, "shippingFee" | "freeShippingThreshold">;
export type ContactInfo = { contactEmail: string; contactPhone: string; contactAddress: string; contactHours: string; contactEmailNote: string; contactAddressNote: string };
export type ShopSettings = SettingsData & ContactInfo & { welcomeDiscountPercent: number };
export const Settings = (mongoose.models.Settings as mongoose.Model<InferSchemaType<typeof settingsSchema>>) || mongoose.model("Settings", settingsSchema);
