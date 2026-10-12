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
    /** Numéro principal (1ᵉʳ de contactPhones, gardé pour compatibilité). */
    contactPhone: { type: String, trim: true, default: "" },
    /** Tous les numéros affichés (le 1ᵉʳ est le principal). */
    contactPhones: { type: [String], default: [] },
    /** Numéro WhatsApp, l'un des numéros ci-dessus. Absent = pas encore choisi (le 1ᵉʳ numéro sert) ; chaîne vide = aucun. */
    whatsappPhone: { type: String, trim: true },
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
    /** Option « Box cadeau » : emballage cadeau facturé en plus (une seule fois par commande), activable par l'admin. */
    giftBoxEnabled: { type: Boolean, default: false },
    giftBoxPrice: { type: Number, min: 0, max: 1000, default: 0 },
    giftBoxDescription: { type: String, trim: true, maxlength: 200, default: "" },
    contactEmailNote: { type: String, trim: true, default: "" },
    contactAddressNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export type SettingsData = Pick<InferSchemaType<typeof settingsSchema>, "shippingFee" | "freeShippingThreshold">;
export type HeroMedia = { heroMediaType: "none" | "image" | "video"; heroMediaUrl: string; heroPosterUrl: string; heroImages: string[]; heroAlt: string };
export type ContactInfo = { contactEmail: string; contactPhone: string; contactPhones: string[]; whatsappPhone: string; contactAddress: string; contactHours: string; contactEmailNote: string; contactAddressNote: string };
export type Announcement = { text: string; isActive: boolean };
export type GiftBoxSettings = { giftBoxEnabled: boolean; giftBoxPrice: number; giftBoxDescription: string };
export type ShopSettings = SettingsData & ContactInfo & GiftBoxSettings & { welcomeDiscountPercent: number; lowStockThreshold: number; announcements: Announcement[] } & HeroMedia;
export const Settings = (mongoose.models.Settings as mongoose.Model<InferSchemaType<typeof settingsSchema>>) || mongoose.model("Settings", settingsSchema);
