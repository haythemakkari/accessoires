import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Product } = await import("@/models/Product");
const { Category } = await import("@/models/Category");
const { Order } = await import("@/models/Order");
const { Settings } = await import("@/models/Settings");
const { createOrder, previewCart } = await import("@/services/order.service");
const { hydrateCart } = await import("@/services/cart.service");
const { productSchema, cartItemSchema } = await import("@/validation/schemas");
const { availablePackagings, publicProduct, cartKey, finalUnitPrice } = await import("@/lib/packaging");
const { mergeCartRefs } = await import("@/lib/cart-merge");

const customer = { fullName: "Test Client", phone: "+21612345678" };
const address = { line: "12 rue des Tests", city: "Tunis" };
const opts = [
  { name: "Packaging simple", price: 3, isAvailable: true, isDefault: true },
  { name: "Packaging premium", price: 8, isAvailable: true, isDefault: false },
  { name: "Emballage cadeau", price: 5, isAvailable: false, isDefault: false },
];

let cat: mongoose.Types.ObjectId;
async function makeProduct(extra = {}) {
  return Product.create({ name: "Montre", slug: `p-${Math.random()}`, price: 100, category: cat, stock: 20, sku: `SKU-${Math.random()}`, ...extra });
}
const idOf = (p: { packagings: { _id: unknown; name: string }[] }, name: string) => String(p.packagings.find((o) => o.name === name)!._id);

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Order.init(), Category.init()]);
  cat = (await Category.create({ name: "Test", slug: "test" }))._id;
});
beforeEach(async () => { await Promise.all([Product.deleteMany({}), Order.deleteMany({}), Settings.deleteMany({})]); });
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("packaging : prix et validation côté serveur", () => {
  it("prix final = prix de base + supplément (promo comprise)", async () => {
    const p = await makeProduct({ isOnSale: true, salePrice: 80, packagingEnabled: true, packagings: opts });
    const q = await previewCart([{ productId: String(p._id), quantity: 2, packagingId: idOf(p, "Packaging premium") }], undefined, null);
    expect(q.subtotal).toBe(176); // (80 + 8) × 2
  });
  it("sans packaging, le prix reste celui du produit", async () => {
    const p = await makeProduct({ packagingEnabled: true, packagings: opts });
    expect((await previewCart([{ productId: String(p._id), quantity: 1 }], undefined, null)).subtotal).toBe(100);
  });
  it("refuse un identifiant de packaging inventé sur un produit sans packaging", async () => {
    const p = await makeProduct();
    await expect(previewCart([{ productId: String(p._id), quantity: 1, packagingId: new mongoose.Types.ObjectId().toString() }], undefined, null)).rejects.toMatchObject({ code: "PACKAGING_INVALID" });
  });
  it("refuse le packaging d'un AUTRE produit", async () => {
    const a = await makeProduct({ packagingEnabled: true, packagings: opts });
    const b = await makeProduct({ packagingEnabled: true, packagings: [{ name: "Autre", price: 1 }] });
    await expect(previewCart([{ productId: String(b._id), quantity: 1, packagingId: idOf(a, "Packaging simple") }], undefined, null)).rejects.toMatchObject({ code: "PACKAGING_INVALID" });
  });
  it("refuse une option indisponible ou un packaging désactivé", async () => {
    const p = await makeProduct({ packagingEnabled: true, packagings: opts });
    await expect(previewCart([{ productId: String(p._id), quantity: 1, packagingId: idOf(p, "Emballage cadeau") }], undefined, null)).rejects.toMatchObject({ code: "PACKAGING_UNAVAILABLE" });
    await Product.updateOne({ _id: p._id }, { packagingEnabled: false });
    await expect(previewCart([{ productId: String(p._id), quantity: 1, packagingId: idOf(p, "Packaging simple") }], undefined, null)).rejects.toMatchObject({ code: "PACKAGING_INVALID" });
  });
  it("une même ligne avec deux packagings différents reste deux lignes", async () => {
    const p = await makeProduct({ packagingEnabled: true, packagings: opts });
    const id = String(p._id);
    const q = await previewCart([{ productId: id, quantity: 1, packagingId: idOf(p, "Packaging simple") }, { productId: id, quantity: 1, packagingId: idOf(p, "Packaging premium") }, { productId: id, quantity: 1 }], undefined, null);
    expect(q.subtotal).toBe(103 + 108 + 100);
  });
});

describe("packaging : commande figée", () => {
  it("conserve une copie du packaging et du prix final, même si le catalogue change ensuite", async () => {
    const p = await makeProduct({ packagingEnabled: true, packagings: opts });
    const pk = idOf(p, "Packaging premium");
    const order = await createOrder({ customer, address, items: [{ productId: String(p._id), quantity: 2, packagingId: pk }] }, null);
    // le catalogue change : supplément, nom, puis suppression de l'option
    await Product.updateOne({ _id: p._id, "packagings._id": pk }, { $set: { "packagings.$.price": 99, "packagings.$.name": "Renommé" } });
    await Product.updateOne({ _id: p._id }, { $pull: { packagings: { _id: pk } }, price: 500 });
    const saved = await Order.findById(order._id).lean();
    const it = saved!.items[0];
    expect(it.price).toBe(108);
    expect(it.basePrice).toBe(100);
    expect(it.packaging).toMatchObject({ id: pk, name: "Packaging premium", supplement: 8 });
    expect(saved!.subtotal).toBe(216);
  });
});

describe("packaging : panier persistant", () => {
  it("réhydrate avec le prix final ; une option retirée rend la ligne indisponible", async () => {
    const p = await makeProduct({ packagingEnabled: true, packagings: opts });
    const pk = idOf(p, "Packaging simple");
    const [ok] = await hydrateCart([{ productId: String(p._id), quantity: 1, packagingId: pk }]);
    expect(ok).toMatchObject({ state: "ok", price: 103, packagingName: "Packaging simple", packagingPrice: 3 });
    await Product.updateOne({ _id: p._id, "packagings._id": pk }, { $set: { "packagings.$.isAvailable": false } });
    const [gone] = await hydrateCart([{ productId: String(p._id), quantity: 1, packagingId: pk }]);
    expect(gone).toMatchObject({ state: "unavailable", reason: "packaging" });
  });
});

describe("packaging : règles pures", () => {
  it("n'expose que les options actives, et rien si le packaging est désactivé", () => {
    const list = opts.map((o, i) => ({ _id: String(i), ...o, description: "" }));
    expect(availablePackagings({ packagingEnabled: true, packagings: list }).map((o) => o.name)).toEqual(["Packaging simple", "Packaging premium"]);
    expect(availablePackagings({ packagingEnabled: false, packagings: list })).toEqual([]);
    expect(publicProduct({ packagingEnabled: true, packagings: list }).packagings).toHaveLength(2);
  });
  it("clé de ligne rétro-compatible et prix arrondi", () => {
    expect(cartKey("p1")).toBe("p1|");
    expect(cartKey("p1", "Noir")).toBe("p1|Noir");
    expect(cartKey("p1", "Noir", "pk")).toBe("p1|Noir|pk");
    expect(finalUnitPrice(19.99, 2.5)).toBe(22.49);
  });
  it("la fusion de paniers distingue les packagings", () => {
    const m = mergeCartRefs([{ productId: "p", quantity: 1, packagingId: "a" }], [{ productId: "p", quantity: 2, packagingId: "b" }, { productId: "p", quantity: 3, packagingId: "a" }]);
    expect(m).toHaveLength(2);
    expect(m.find((r) => r.packagingId === "a")!.quantity).toBe(3);
  });
  it("le panier accepte un packagingId valide seulement", () => {
    expect(cartItemSchema.safeParse({ productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1, packagingId: "6ac3d838f2a3ae4b031fbc83" }).success).toBe(true);
    expect(cartItemSchema.safeParse({ productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1, packagingId: "nimporte" }).success).toBe(false);
  });
});

describe("packaging : saisie admin", () => {
  const base = { name: "Montre", price: 100, category: "6ac3d838f2a3ae4b031fbc82", stock: 5 };
  it("accepte une configuration valide", () => {
    expect(productSchema.safeParse({ ...base, packagingEnabled: true, packagings: opts }).success).toBe(true);
  });
  it("refuse : activé sans option, doublon de nom, deux défauts, défaut indisponible, supplément négatif", () => {
    const bad = (packagings: unknown[]) => productSchema.safeParse({ ...base, packagingEnabled: true, packagings }).success;
    expect(bad([])).toBe(false);
    expect(bad([{ name: "A", price: 1 }, { name: "a", price: 2 }])).toBe(false);
    expect(bad([{ name: "A", price: 1, isDefault: true }, { name: "B", price: 2, isDefault: true }])).toBe(false);
    expect(bad([{ name: "A", price: 1, isDefault: true, isAvailable: false }])).toBe(false);
    expect(bad([{ name: "A", price: -1 }])).toBe(false);
  });
  it("désactivé : les options sont ignorées sans erreur", () => {
    expect(productSchema.safeParse({ ...base, packagingEnabled: false, packagings: [] }).success).toBe(true);
  });
});
