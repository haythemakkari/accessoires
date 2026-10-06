import { z } from "zod";
import { GENDERS } from "@/models/Product";
import { ORDER_STATUSES } from "@/models/Order";
import { GOVERNORATES } from "@/lib/tunisia";
import { PHONE_ERROR, parseTunisianPhone } from "@/lib/phone";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Identifiant invalide");
/** Numéro tunisien : validé puis normalisé en « +216XXXXXXXX ». */
export const phone = z
  .string()
  .trim()
  .refine((v) => parseTunisianPhone(v) !== null, PHONE_ERROR)
  .transform((v) => parseTunisianPhone(v)!);
/** Champ facultatif : une chaîne vide équivaut à « non renseigné », mais une valeur saisie doit être valide (message précis). */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalPhone = z.preprocess(emptyToUndefined, phone.optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().trim().email("Email invalide").max(150).optional());
const password = z
  .string()
  .min(8, "8 caractères minimum")
  .max(100)
  .regex(/[A-Za-z]/, "Doit contenir une lettre")
  .regex(/[0-9]/, "Doit contenir un chiffre");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(100),
  email: z.string().trim().email("Email invalide").max(150),
  password,
  phone: optionalPhone,
});
export const loginSchema = z.object({ email: z.string().trim().email("Email invalide"), password: z.string().min(1).max(100) });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: optionalPhone,
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });

export const cartItemSchema = z.object({
  productId: objectId,
  quantity: z.number().int().min(1, "Quantité invalide").max(50),
  variant: z.string().trim().max(200).optional(),
});

export const couponCheckSchema = z.object({
  code: z.string().trim().min(1, "Code requis").max(40),
  items: z.array(cartItemSchema).min(1).max(50),
});

export const checkoutSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2, "Nom requis").max(100),
    phone,
    email: optionalEmail,
  }),
  address: z.object({
    line: z.string().trim().min(5, "Adresse requise").max(250),
    city: z.enum(GOVERNORATES, { message: "Choisissez un gouvernorat dans la liste" }),
    postalCode: z.string().trim().max(10).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  items: z.array(cartItemSchema).min(1, "Panier vide").max(50),
  couponCode: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().max(5000).default(""),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).nullish(),
    salePrice: z.number().min(0).nullish(),
    isOnSale: z.boolean().default(false),
    category: objectId,
    gender: z.enum(GENDERS).default("unisex"),
    // Fichiers téléversés (/uploads/…) ou liens http(s) : rien d'autre (pas de javascript:, data:, chemins arbitraires).
    images: z.array(z.string().trim().max(500).regex(/^(\/uploads\/[\w.\-]+|https?:\/\/\S+)$/i, "Lien d'image invalide")).max(10).default([]),
    stock: z.number().int().min(0),
    /** Facultatif : généré automatiquement si vide. */
    sku: z.preprocess(emptyToUndefined, z.string().trim().max(60, "60 caractères maximum").optional()),
    variants: z
      .array(z.object({ name: z.string().trim().min(1).max(40), options: z.array(z.string().trim().min(1).max(40)).min(1).max(30) }))
      .max(5)
      .default([]),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  })
  .refine((p) => !p.isOnSale || (p.salePrice != null && p.salePrice < p.price), {
    message: "Le prix promo doit être inférieur au prix",
    path: ["salePrice"],
  });
export const productPatchSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  stock: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "Lettres, chiffres, - et _ uniquement"),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().positive(),
    startsAt: z.coerce.date().nullish(),
    expiresAt: z.coerce.date().nullish(),
    maxUses: z.number().int().min(1).nullish(),
    minOrderAmount: z.number().min(0).default(0),
    isActive: z.boolean().default(true),
    allowedUsers: z.array(objectId).default([]),
  })
  .refine((c) => c.type !== "percentage" || c.value <= 100, { message: "Maximum 100%", path: ["value"] })
  .refine((c) => !c.startsAt || !c.expiresAt || c.expiresAt > c.startsAt, { message: "Expiration avant le début", path: ["expiresAt"] });

export const settingsSchema = z.object({
  shippingFee: z.number().min(0, "Montant invalide").max(1000),
  freeShippingThreshold: z.number().min(0, "Montant invalide").max(100000),
});

export const welcomeSettingsSchema = z.object({
  welcomeDiscountPercent: z.number().int("Nombre entier requis").min(0, "Minimum 0 (0 = offre désactivée)").max(50, "50 % maximum"),
});

export const contactSettingsSchema = z.object({
  contactEmail: z.preprocess(emptyToUndefined, z.string().trim().email("Email invalide").max(150).optional()).transform((v) => v ?? ""),
  contactPhone: optionalPhone.transform((v) => v ?? ""),
  contactAddress: z.string().trim().max(200, "200 caractères maximum"),
  contactHours: z.string().trim().max(200, "200 caractères maximum"),
  contactEmailNote: z.string().trim().max(200, "200 caractères maximum").default(""),
  contactAddressNote: z.string().trim().max(200, "200 caractères maximum").default(""),
});

export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(2, "Nom requis").max(100),
    phone: optionalPhone,
    email: optionalEmail,
    subject: z.string().trim().min(3, "Objet requis").max(120),
    message: z.string().trim().min(10, "Message trop court (10 caractères minimum)").max(2000, "2000 caractères maximum"),
    orderNumber: z.preprocess(emptyToUndefined, z.string().trim().toUpperCase().regex(/^NM-\d{6}-[A-F0-9]{6}$/, "Numéro de commande invalide").optional()),
    website: z.string().max(0, "Requête invalide").optional(), // champ piège anti-robots : doit rester vide
  })
  .refine((m) => m.phone || m.email, { message: "Indiquez un téléphone ou un email pour que nous puissions vous répondre", path: ["phone"] });

export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const productListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  gender: z.enum(GENDERS).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.enum(["true", "false"]).optional(),
  onSale: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});
