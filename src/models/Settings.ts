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
    /** Alerte « stock bas » : produits actifs dont le stock est strictement inférieur à ce seuil. */
    lowStockThreshold: { type: Number, min: 1, max: 1000, default: 10 },
    /** Média principal de la page d'accueil (choisi par l'admin) : image ou courte vidéo. */
    heroMediaType: { type: String, enum: ["none", "image", "video"], default: "none" },
    heroMediaUrl: { type: String, trim: true, default: "" },
    heroPosterUrl: { type: String, trim: true, default: "" },
    /** Photos du diaporama (type « image ») : 1 à 8, affichées dans l'ordre, une nouvelle toutes les 2 s. */
    heroImages: { type: [String], default: [] },
    heroAlt: { type: String, trim: true, default: "" },
    /** Messages de la barre d'annonces (en plus de « livraison offerte » et de l'offre de bienvenue, automatiques). */
    announcements: { type: [new Schema({ text: { type: String, required: true, trim: true, maxlength: 120 }, isActive: { type: Boolean, default: true } }, { _id: false })], default: [] },
    contactEmailNote: { type: String, trim: true, default: "" },
    contactAddressNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export type SettingsData = Pick<InferSchemaType<typeof settingsSchema>, "shippingFee" | "freeShippingThreshold">;
export type HeroMedia = { heroMediaType: "none" | "image" | "video"; heroMediaUrl: string; heroPosterUrl: string; heroImages: string[]; heroAlt: string };
export type ContactInfo = { contactEmail: string; contactPhone: string; contactAddress: string; contactHours: string; contactEmailNote: string; contactAddressNote: string };
export type Announcement = { text: string; isActive: boolean };
export type ShopSettings = SettingsData & ContactInfo & { welcomeDiscountPercent: number; lowStockThreshold: number; announcements: Announcement[] } & HeroMedia;
export const Settings = (mongoose.models.Settings as mongoose.Model<InferSchemaType<typeof settingsSchema>>) || mongoose.model("Settings", settingsSchema);
