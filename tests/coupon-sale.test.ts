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
const { couponDiscount } = await import("@/services/pricing");
const { createWelcomeCoupon } = await import("@/services/coupon.service");
const { couponSchema } = await import("@/validation/schemas");

const D = 86_400_000;
let cat: mongoose.Types.ObjectId;
let regular: string, onSale: string, scheduled: string;
const customer = { fullName: "Test Client", phone: "+21620123456" };
const address = { line: "12 rue des Tests", city: "Tunis" };
const mkProduct = async (name: string, extra = {}) => String((await Product.create({ name, slug: `${name}-${Math.random()}`.replace(/\s/g, "-"), price: 100, category: cat, stock: 20, sku: `S-${Math.random()}`, ...extra }))._id);
const mkCoupon = (extra: Record<string, unknown>) => Coupon.create({ code: `C${Math.random().toString(36).slice(2, 8)}`, type: "percentage", value: 20, ...extra });
const cart = (...ids: string[]) => ids.map((productId) => ({ productId, quantity: 1 }));

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Coupon.init(), Order.init(), Category.init()]);
  cat = (await Category.create({ name: "Test", slug: "test" }))._id;
});
beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Coupon.deleteMany({}), Order.deleteMany({}), Settings.deleteMany({})]);
  await Settings.create({ key: "shop", shippingFee: 0, freeShippingThreshold: 0 });
  regular = await mkProduct("Normal");
  onSale = await mkProduct("Soldé", { isOnSale: true, salePrice: 60 });
  scheduled = await mkProduct("Promo à venir", { isOnSale: true, salePrice: 50, saleStartsAt: new Date(Date.now() + 2 * D) });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("coupon : produits en promotion exclus", () => {
  it("pourcentage : la réduction ne porte que sur la part hors promotion", async () => {
    const c = await mkCoupon({ value: 20, appliesToSaleItems: false });
    const q = await previewCart(cart(regular, onSale), c.code, null); // 100 + 60
    expect(q).toMatchObject({ subtotal: 160, discount: 20, total: 140, excludesSale: true }); // 20 % de 100, pas de 160
  });
  it("même coupon mais autorisé sur les promos : tout le panier est réduit", async () => {
    const c = await mkCoupon({ value: 20, appliesToSaleItems: true });
    expect(await previewCart(cart(regular, onSale), c.code, null)).toMatchObject({ discount: 32, total: 128, excludesSale: false });
  });
  it("montant fixe : plafonné à la part hors promotion", async () => {
    const c = await mkCoupon({ type: "fixed", value: 150, appliesToSaleItems: false });
    expect(await previewCart(cart(regular, onSale), c.code, null)).toMatchObject({ discount: 100, total: 60 });
    const c2 = await mkCoupon({ type: "fixed", value: 30, appliesToSaleItems: false });
    expect(await previewCart(cart(regular, onSale), c2.code, null)).toMatchObject({ discount: 30, total: 130 });
  });
  it("panier entièrement en promotion : le code est refusé avec un message clair", async () => {
    const c = await mkCoupon({ appliesToSaleItems: false });
    await expect(previewCart(cart(onSale), c.code, null)).rejects.toMatchObject({ code: "COUPON_SALE_ONLY", message: "Ce code ne s'applique pas aux produits en promotion" });
    await expect(createOrder({ customer, address, items: cart(onSale), couponCode: c.code }, null)).rejects.toMatchObject({ code: "COUPON_SALE_ONLY" });
    expect((await Product.findById(onSale))!.stock).toBe(20); // rien n'a été vendu
    expect((await Coupon.findById(c._id))!.usedCount).toBe(0);
  });
  it("une promo programmée (pas encore commencée) compte comme un produit normal", async () => {
    const c = await mkCoupon({ value: 20, appliesToSaleItems: false });
    expect(await previewCart(cart(scheduled), c.code, null)).toMatchObject({ subtotal: 100, discount: 20 });
  });
  it("une promo terminée compte aussi comme un produit normal", async () => {
    const ended = await mkProduct("Promo finie", { isOnSale: true, salePrice: 50, saleStartsAt: new Date(Date.now() - 5 * D), saleEndsAt: new Date(Date.now() - D) });
    const c = await mkCoupon({ value: 10, appliesToSaleItems: false });
    expect(await previewCart(cart(ended), c.code, null)).toMatchObject({ subtotal: 100, discount: 10 });
  });
  it("ancien coupon (sans le champ) : s'applique à tout, comme avant", async () => {
    await Coupon.collection.insertOne({ code: "VIEUX10", type: "percentage", value: 10, usedCount: 0, minOrderAmount: 0, isActive: true, allowedUsers: [], kind: "standard", createdAt: new Date(), updatedAt: new Date() });
    expect(await previewCart(cart(regular, onSale), "VIEUX10", null)).toMatchObject({ discount: 16, excludesSale: false });
  });
  it("la commande enregistre la bonne réduction et le bon total", async () => {
    const c = await mkCoupon({ value: 20, appliesToSaleItems: false });
    const o = await createOrder({ customer, address, items: cart(regular, onSale), couponCode: c.code }, null);
    expect(o).toMatchObject({ subtotal: 160, discount: 20, total: 140 });
    expect((await Coupon.findById(c._id))!.usedCount).toBe(1);
  });
});

describe("coupon : calcul pur et saisie admin", () => {
  it("couponDiscount : base = panier − part soldée quand les promos sont exclues", () => {
    expect(couponDiscount({ type: "percentage", value: 50, appliesToSaleItems: false }, 200, 120)).toEqual({ discount: 40, excludesSale: true, base: 80 });
    expect(couponDiscount({ type: "percentage", value: 50 }, 200, 120)).toEqual({ discount: 100, excludesSale: false, base: 200 });
    expect(() => couponDiscount({ type: "fixed", value: 10, appliesToSaleItems: false }, 120, 120)).toThrow();
  });
  it("le formulaire admin : l'option vaut « oui » par défaut et accepte « non »", () => {
    const base = { code: "ETE20", type: "percentage" as const, value: 20 };
    const d = couponSchema.safeParse(base);
    expect(d.success && d.data.appliesToSaleItems).toBe(true);
    const n = couponSchema.safeParse({ ...base, appliesToSaleItems: false });
    expect(n.success && n.data.appliesToSaleItems).toBe(false);
    expect(couponSchema.safeParse({ ...base, appliesToSaleItems: "non" }).success).toBe(false);
  });
});

describe("code de bienvenue : jamais sur les produits en promotion", () => {
  const uid = new mongoose.Types.ObjectId();
  it("un nouveau code de bienvenue est créé « hors promos » et ne réduit que la part non soldée", async () => {
    const { code } = await createWelcomeCoupon(uid, 15);
    const doc = await Coupon.findOne({ code });
    expect(doc).toMatchObject({ kind: "welcome", appliesToSaleItems: false });
    const q = await previewCart(cart(regular, onSale), code, String(uid)); // 100 + 60
    expect(q).toMatchObject({ subtotal: 160, discount: 15, total: 145, excludesSale: true }); // 15 % de 100 seulement
  });
  it("un code de bienvenue déjà émis (sans le champ) est lui aussi exclu des promos", async () => {
    await Coupon.collection.insertOne({ code: "WELCOME-OLD111", type: "percentage", value: 10, maxUses: 1, usedCount: 0, minOrderAmount: 0, isActive: true, allowedUsers: [uid], kind: "welcome", createdAt: new Date(), updatedAt: new Date() });
    expect(await previewCart(cart(regular, onSale), "WELCOME-OLD111", String(uid))).toMatchObject({ discount: 10, excludesSale: true });
  });
  it("panier 100 % soldé : le code de bienvenue est refusé, sans être consommé", async () => {
    const { code } = await createWelcomeCoupon(uid, 15);
    await expect(createOrder({ customer, address, items: cart(onSale), couponCode: code }, String(uid))).rejects.toMatchObject({ code: "COUPON_SALE_ONLY" });
    const doc = await Coupon.findOne({ code });
    expect(doc!.usedCount).toBe(0);
    expect(doc!.isActive).toBe(true); // le code reste utilisable plus tard
  });
  it("sur un panier normal, le code de bienvenue marche comme avant et se consomme", async () => {
    const { code } = await createWelcomeCoupon(uid, 15);
    const o = await createOrder({ customer, address, items: cart(regular), couponCode: code }, String(uid));
    expect(o).toMatchObject({ subtotal: 100, discount: 15, total: 85 });
    expect((await Coupon.findOne({ code }))!.usedCount).toBe(1);
  });
});
