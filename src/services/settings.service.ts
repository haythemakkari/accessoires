import { env } from "@/lib/env";
import { resolveContactPhones } from "@/lib/contact-phones";
import { Settings, type Announcement, type GiftBoxSettings, type ContactInfo, type HeroMedia, type SettingsData, type ShopSettings } from "@/models/Settings";

const emptyContact: ContactInfo = { contactEmail: "", contactPhone: "", contactPhones: [], whatsappPhone: "", contactAddress: "", contactHours: "", contactEmailNote: "", contactAddressNote: "" };

/** Valeurs par défaut (variables d'environnement) tant que l'admin n'a rien enregistré. */
export const defaultSettings = (): ShopSettings => ({ shippingFee: env.shippingFee, freeShippingThreshold: env.freeShippingThreshold, ...emptyContact, welcomeDiscountPercent: 10, lowStockThreshold: 10, announcements: [], giftBoxEnabled: false, giftBoxPrice: 0, giftBoxDescription: "", heroMediaType: "none", heroMediaUrl: "", heroPosterUrl: "", heroImages: [], heroAlt: "" });

export async function getSettings(): Promise<ShopSettings> {
  const s = await Settings.findOne({ key: "shop" }).lean();
  if (!s) return defaultSettings();
  return {
    shippingFee: s.shippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    contactEmail: s.contactEmail ?? "",
    contactPhone: resolveContactPhones(s).primary,
    contactPhones: resolveContactPhones(s).phones,
    whatsappPhone: resolveContactPhones(s).whatsapp,
    contactAddress: s.contactAddress ?? "",
    contactHours: s.contactHours ?? "",
    welcomeDiscountPercent: s.welcomeDiscountPercent ?? 10,
    lowStockThreshold: s.lowStockThreshold ?? 10,
    giftBoxEnabled: s.giftBoxEnabled ?? false,
    giftBoxPrice: s.giftBoxPrice ?? 0,
    giftBoxDescription: s.giftBoxDescription ?? "",
    announcements: (s.announcements ?? []).map((a) => ({ text: a.text, isActive: a.isActive !== false })),
    heroMediaType: (s.heroMediaType as HeroMedia["heroMediaType"]) ?? "none",
    heroMediaUrl: s.heroMediaUrl ?? "",
    heroPosterUrl: s.heroPosterUrl ?? "",
    // Compatibilité : une ancienne image unique (heroMediaUrl) devient un diaporama d'une photo.
    heroImages: s.heroImages?.length ? [...s.heroImages] : s.heroMediaType === "image" && s.heroMediaUrl ? [s.heroMediaUrl] : [],
    heroAlt: s.heroAlt ?? "",
    contactEmailNote: s.contactEmailNote ?? "",
    contactAddressNote: s.contactAddressNote ?? "",
  };
}

/** Met à jour uniquement les champs fournis (livraison et coordonnées sont modifiées par deux formulaires distincts). */
export async function updateSettings(data: Partial<SettingsData & ContactInfo & { welcomeDiscountPercent: number; lowStockThreshold: number; announcements: Announcement[] } & GiftBoxSettings & HeroMedia>): Promise<ShopSettings> {
  const defaults = defaultSettings();
  // À la 1ʳᵉ création du document, les champs de livraison non fournis prennent leur valeur par défaut (obligatoires dans le modèle).
  const onInsert: Record<string, unknown> = { key: "shop" };
  if (data.shippingFee === undefined) onInsert.shippingFee = defaults.shippingFee;
  if (data.freeShippingThreshold === undefined) onInsert.freeShippingThreshold = defaults.freeShippingThreshold;
  await Settings.updateOne({ key: "shop" }, { $set: data, $setOnInsert: onInsert }, { upsert: true });
  return getSettings();
}
