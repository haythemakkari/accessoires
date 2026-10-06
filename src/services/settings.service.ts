import { env } from "@/lib/env";
import { Settings, type ContactInfo, type SettingsData, type ShopSettings } from "@/models/Settings";

const emptyContact: ContactInfo = { contactEmail: "", contactPhone: "", contactAddress: "", contactHours: "", contactEmailNote: "", contactAddressNote: "" };

/** Valeurs par défaut (variables d'environnement) tant que l'admin n'a rien enregistré. */
export const defaultSettings = (): ShopSettings => ({ shippingFee: env.shippingFee, freeShippingThreshold: env.freeShippingThreshold, ...emptyContact, welcomeDiscountPercent: 10 });

export async function getSettings(): Promise<ShopSettings> {
  const s = await Settings.findOne({ key: "shop" }).lean();
  if (!s) return defaultSettings();
  return {
    shippingFee: s.shippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    contactEmail: s.contactEmail ?? "",
    contactPhone: s.contactPhone ?? "",
    contactAddress: s.contactAddress ?? "",
    contactHours: s.contactHours ?? "",
    welcomeDiscountPercent: s.welcomeDiscountPercent ?? 10,
    contactEmailNote: s.contactEmailNote ?? "",
    contactAddressNote: s.contactAddressNote ?? "",
  };
}

/** Met à jour uniquement les champs fournis (livraison et coordonnées sont modifiées par deux formulaires distincts). */
export async function updateSettings(data: Partial<SettingsData & ContactInfo & { welcomeDiscountPercent: number }>): Promise<ShopSettings> {
  const defaults = defaultSettings();
  // À la 1ʳᵉ création du document, les champs de livraison non fournis prennent leur valeur par défaut (obligatoires dans le modèle).
  const onInsert: Record<string, unknown> = { key: "shop" };
  if (data.shippingFee === undefined) onInsert.shippingFee = defaults.shippingFee;
  if (data.freeShippingThreshold === undefined) onInsert.freeShippingThreshold = defaults.freeShippingThreshold;
  await Settings.updateOne({ key: "shop" }, { $set: data, $setOnInsert: onInsert }, { upsert: true });
  return getSettings();
}
