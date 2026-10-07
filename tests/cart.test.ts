import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { mergeCartRefs } from "@/lib/cart-merge";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Product } = await import("@/models/Product");
const { Category } = await import("@/models/Category");
const { Cart } = await import("@/models/Cart");
const { hydrateCart, loadStoredCart, saveStoredCart } = await import("@/services/cart.service");

describe("fusion de paniers (navigateur + compte)", () => {
  it("garde la plus grande quantité d'un même article (jamais la somme) et conserve les articles propres à chaque côté", () => {
    const m = mergeCartRefs(
      [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 1, variant: "Noir" }],
      [{ productId: "a", quantity: 3 }, { productId: "c", quantity: 1 }],
    );
    expect(m).toEqual([{ productId: "a", quantity: 3 }, { productId: "b", quantity: 1, variant: "Noir" }, { productId: "c", quantity: 1 }]);
  });
  it("fusionner deux fois le même panier ne double rien", () => {
    const cart = [{ productId: "a", quantity: 2 }];
    expect(mergeCartRefs(cart, cart)).toEqual(cart);
  });
  it("distingue les variantes d'un même produit, et plafonne quantités et nombre de lignes", () => {
    expect(mergeCartRefs([{ productId: "a", quantity: 1, variant: "Noir" }], [{ productId: "a", quantity: 1, variant: "Rouge" }])).toHaveLength(2);
    expect(mergeCartRefs([{ productId: "a", quantity: 99 }], [])[0].quantity).toBe(50);
    expect(mergeCartRefs(Array.from({ length: 80 }, (_, i) => ({ productId: String(i), quantity: 1 })), [])).toHaveLength(50);
  });
});

let cat: mongoose.Types.ObjectId;
const mk = (name: string, extra: Record<string, unknown> = {}) =>
  Product.create({ name, slug: `${name}-${Math.random()}`.toLowerCase().replace(/\s/g, "-"), price: 100, category: cat, stock: 5, sku: `SKU-${Math.random()}`, ...extra });

beforeAll(async () => { await connectDB(); await Promise.all([Product.init(), Cart.init()]); cat = (await Category.create({ name: "CartTest", slug: `ct-${Date.now()}` }))._id; });
beforeEach(async () => { await Promise.all([Product.deleteMany({}), Cart.deleteMany({})]); });
afterAll(async () => { await mongoose.disconnect(); });

describe("remise à jour du panier au retour du client", () => {
  it("met à jour prix et nom, et signale produit supprimé / désactivé / épuisé", async () => {
    const ok = await mk("Bague", { price: 100, isOnSale: true, salePrice: 80 });
    const off = await mk("Inactif", { isActive: false });
    const out = await mk("Epuise", { stock: 0 });
    const r = await hydrateCart([
      { productId: String(ok._id), quantity: 2 },
      { productId: String(off._id), quantity: 1 },
      { productId: String(out._id), quantity: 1 },
      { productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1 }, // n'existe plus
    ]);
    expect(r[0]).toMatchObject({ state: "ok", price: 80, quantity: 2, name: "Bague" }); // prix promo actuel
    expect(r[1]).toMatchObject({ state: "unavailable", reason: "missing" });
    expect(r[2]).toMatchObject({ state: "unavailable", reason: "soldout" });
    expect(r[3]).toMatchObject({ state: "unavailable", reason: "missing" });
  });
  it("ramène la quantité au stock restant, en le répartissant entre les variantes d'un même produit", async () => {
    const p = await mk("Sac", { stock: 3, variants: [{ name: "Couleur", options: ["Noir", "Rouge"] }] });
    const r = await hydrateCart([{ productId: String(p._id), quantity: 2, variant: "Noir" }, { productId: String(p._id), quantity: 2, variant: "Rouge" }]);
    expect(r[0]).toMatchObject({ state: "ok", quantity: 2 });
    expect(r[1]).toMatchObject({ state: "adjusted", quantity: 1, requested: 2 }); // il ne restait qu'1 unité
  });
  it("option retirée → indisponible ; photo de la couleur choisie reprise", async () => {
    const p = await mk("Pochette", { images: ["/uploads/main.webp"], variants: [{ name: "Couleur", options: ["Noir"], optionImages: [{ option: "Noir", image: "/uploads/noir.webp" }] }] });
    const r = await hydrateCart([{ productId: String(p._id), quantity: 1, variant: "Noir" }, { productId: String(p._id), quantity: 1, variant: "Vert" }]);
    expect(r[0]).toMatchObject({ state: "ok", image: "/uploads/noir.webp" });
    expect(r[1]).toMatchObject({ state: "unavailable", reason: "variant" });
  });
});

describe("panier enregistré sur le compte", () => {
  const user = "6ac3d838f2a3ae4b031fbc99";
  it("aller-retour : enregistre puis retrouve le même panier, avec le code promo", async () => {
    const p = await mk("Collier");
    await saveStoredCart(user, [{ productId: String(p._id), quantity: 2, variant: undefined }], "welcome-abc123");
    const back = await loadStoredCart(user);
    expect(back.items).toEqual([{ productId: String(p._id), quantity: 2, variant: undefined }]);
    expect(back.couponCode).toBe("WELCOME-ABC123");
  });
  it("une nouvelle sauvegarde remplace l'ancienne ; un panier vide supprime le document", async () => {
    const p = await mk("Bracelet");
    await saveStoredCart(user, [{ productId: String(p._id), quantity: 1 }]);
    await saveStoredCart(user, [{ productId: String(p._id), quantity: 4 }]);
    expect((await loadStoredCart(user)).items[0].quantity).toBe(4);
    await saveStoredCart(user, []);
    expect(await Cart.countDocuments({ user })).toBe(0);
    expect((await loadStoredCart(user)).items).toEqual([]);
  });
  it("expire automatiquement (index TTL de 60 jours)", async () => {
    const idx = await Cart.collection.indexes();
    expect(idx.some((i) => i.key && "updatedAt" in i.key && i.expireAfterSeconds === 60 * 24 * 3600)).toBe(true);
  });
});
