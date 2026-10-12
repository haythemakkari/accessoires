import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Product } = await import("@/models/Product");
const { Category } = await import("@/models/Category");
const { Coupon } = await import("@/models/Coupon");
const { Order } = await import("@/models/Order");
const { Settings } = await import("@/models/Settings");
const { previewCart, createOrder } = await import("@/services/order.service");
const { getSettings, updateSettings } = await import("@/services/settings.service");
const { computeTotals } = await import("@/services/pricing");
const { giftBoxSettingsSchema, checkoutSchema } = await import("@/validation/schemas");

const customer = { fullName: "Test Client", phone: "+21620123456" };
const address = { line: "12 rue des Tests", city: "Tunis" };
let pid: string;
const items = (q = 1) => [{ productId: pid, quantity: q }];
const setGift = (enabled: boolean, price = 13) => updateSettings({ giftBoxEnabled: enabled, giftBoxPrice: price, giftBoxDescription: "Emballage luxe" });

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Coupon.init(), Order.init(), Category.init()]);
  const cat = await Category.create({ name: "Test", slug: "test" });
  pid = String((await Product.create({ name: "Montre", slug: "montre", price: 100, category: cat._id, stock: 50, sku: "S1" }))._id);
});
beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Settings.deleteMany({}), Coupon.deleteMany({})]);
  await updateSettings({ shippingFee: 8, freeShippingThreshold: 150 });
  await Product.updateOne({ _id: pid }, { stock: 50 });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("box cadeau : réglages admin", () => {
  it("désactivée par défaut, puis activée avec son prix et sa description", async () => {
    expect(await getSettings()).toMatchObject({ giftBoxEnabled: false, giftBoxPrice: 0, giftBoxDescription: "" });
    await setGift(true, 13);
    expect(await getSettings()).toMatchObject({ giftBoxEnabled: true, giftBoxPrice: 13, giftBoxDescription: "Emballage luxe", shippingFee: 8 });
  });
  it("validation : prix 0 à 1000, description 200 caractères", () => {
    expect(giftBoxSettingsSchema.safeParse({ giftBoxEnabled: true, giftBoxPrice: 13 }).success).toBe(true);
    expect(giftBoxSettingsSchema.safeParse({ giftBoxEnabled: true, giftBoxPrice: -1 }).success).toBe(false);
    expect(giftBoxSettingsSchema.safeParse({ giftBoxEnabled: true, giftBoxPrice: 5000 }).success).toBe(false);
    expect(giftBoxSettingsSchema.safeParse({ giftBoxEnabled: true, giftBoxPrice: 13, giftBoxDescription: "x".repeat(201) }).success).toBe(false);
    expect(giftBoxSettingsSchema.safeParse({ giftBoxEnabled: "oui", giftBoxPrice: 13 }).success).toBe(false);
  });
  it("commande : giftBox booléen et message limité à 200 caractères", () => {
    const base = { customer: { fullName: "Test", phone: "+21620123456" }, address: { line: "12 rue des Tests", city: "Tunis" }, items: [{ productId: "6ac3d838f2a3ae4b031fbc82", quantity: 1 }] };
    const ok = checkoutSchema.safeParse({ ...base, giftBox: true, giftMessage: "Joyeux anniversaire !" });
    expect(ok.success && ok.data.giftBox).toBe(true);
    expect(checkoutSchema.safeParse(base).success && checkoutSchema.parse(base).giftBox).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, giftBox: true, giftMessage: "x".repeat(201) }).success).toBe(false);
  });
});

describe("box cadeau : totaux", () => {
  it("s'ajoute une seule fois au total, même avec plusieurs articles", async () => {
    await setGift(true, 13);
    expect(await previewCart(items(1), undefined, null, true)).toMatchObject({ subtotal: 100, giftBoxFee: 13, shippingFee: 8, total: 121 });
    expect(await previewCart(items(2), undefined, null, true)).toMatchObject({ subtotal: 200, giftBoxFee: 13, shippingFee: 0, total: 213 }); // livraison offerte dès 150
  });
  it("sans la case cochée : aucun frais", async () => {
    await setGift(true, 13);
    expect(await previewCart(items(1), undefined, null, false)).toMatchObject({ giftBoxFee: 0, total: 108 });
  });
  it("ne compte pas dans le seuil de livraison offerte, et le coupon ne la réduit pas", async () => {
    await setGift(true, 60);
    // 100 + 60 de box = 160 ≥ 150, mais la livraison reste facturée : le seuil ne regarde que les articles
    expect(await previewCart(items(1), undefined, null, true)).toMatchObject({ shippingFee: 8, total: 168 });
    await Coupon.create({ code: "MOINS10", type: "percentage", value: 10 });
    expect(await previewCart(items(1), "MOINS10", null, true)).toMatchObject({ discount: 10, giftBoxFee: 60, total: 90 + 8 + 60 });
  });
  it("option désactivée : ignorée dans l'aperçu du panier", async () => {
    await setGift(false, 13);
    expect(await previewCart(items(1), undefined, null, true)).toMatchObject({ giftBoxFee: 0, total: 108 });
  });
  it("calcul pur", () => {
    expect(computeTotals(100, 20, { shippingFee: 8, freeShippingThreshold: 0 }, 13)).toEqual({ subtotal: 100, discount: 20, shippingFee: 8, giftBoxFee: 13, total: 101 });
    expect(computeTotals(100, 0, { shippingFee: 8, freeShippingThreshold: 0 })).toMatchObject({ giftBoxFee: 0, total: 108 });
  });
});

describe("box cadeau : commande", () => {
  it("enregistre le prix figé et le message de la carte ; le total en tient compte", async () => {
    await setGift(true, 13);
    const o = await createOrder({ customer, address, items: items(1), giftBox: true, giftMessage: "Joyeux anniversaire Sara" }, null);
    expect(o).toMatchObject({ subtotal: 100, total: 121 });
    expect(o.giftBox).toMatchObject({ price: 13, message: "Joyeux anniversaire Sara" });
    // le prix change ensuite : la commande passée ne bouge pas
    await setGift(true, 99);
    expect((await Order.findById(o._id).lean())!.giftBox).toMatchObject({ price: 13 });
  });
  it("sans box cadeau : aucun champ giftBox enregistré", async () => {
    await setGift(true, 13);
    const o = await createOrder({ customer, address, items: items(1) }, null);
    expect(o.giftBox).toBeUndefined();
    expect(o.total).toBe(108);
  });
  it("option désactivée entre-temps : la commande est refusée avec un message clair, sans rien vendre", async () => {
    await setGift(false, 13);
    await expect(createOrder({ customer, address, items: items(1), giftBox: true }, null)).rejects.toMatchObject({ code: "GIFTBOX_DISABLED" });
    expect((await Product.findById(pid))!.stock).toBe(50);
    expect(await Order.countDocuments()).toBe(0);
  });
  it("le prix envoyé par le navigateur n'a aucune influence : seul le réglage admin compte", async () => {
    await setGift(true, 13);
    const o = await createOrder({ customer, address, items: items(1), giftBox: true, giftPrice: 0 } as never, null);
    expect(o.giftBox).toMatchObject({ price: 13 });
  });
});
