import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Product } = await import("@/models/Product");
const { Category } = await import("@/models/Category");
const { Coupon } = await import("@/models/Coupon");
const { Order } = await import("@/models/Order");
const { User } = await import("@/models/User");
const { Settings } = await import("@/models/Settings");
const { createOrder, updateOrderStatus } = await import("@/services/order.service");
const { registerCustomer } = await import("@/services/auth.service");
const { normalizeEmail } = await import("@/lib/utils");

const customer = { fullName: "Test Client", phone: "+21612345678" };
const address = { line: "12 rue des Tests", city: "Tunis" };

let productId: string;
async function makeProduct(stock: number, extra = {}) {
  const cat = (await Category.findOne()) ?? (await Category.create({ name: "Test", slug: "test" }));
  const p = await Product.create({ name: "Portefeuille", slug: `p-${Date.now()}-${Math.random()}`, price: 100, category: cat._id, stock, sku: `SKU-${Math.random()}`, ...extra });
  productId = String(p._id);
}

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Coupon.init(), User.init(), Order.init(), Category.init()]);
});
beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({}), User.deleteMany({}), Settings.deleteMany({})]);
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("stock & concurrence", () => {
  it("ne vend jamais plus que le stock lors de commandes simultanées", async () => {
    await makeProduct(3);
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => createOrder({ customer, address, items: [{ productId, quantity: 1 }] }, null)),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(3);
    expect((await Product.findById(productId))!.stock).toBe(0);
    expect(await Order.countDocuments()).toBe(3);
  });

  it("utilise le prix de la base (promo) et marque la commande invité", async () => {
    await makeProduct(5, { isOnSale: true, salePrice: 80 });
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 2 }] }, null);
    expect(o.isGuest).toBe(true);
    expect(o.subtotal).toBe(160);
  });

  it("remet le stock lors d'une annulation (une seule fois)", async () => {
    await makeProduct(5);
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 2 }] }, null);
    await updateOrderStatus(String(o._id), "cancelled");
    expect((await Product.findById(productId))!.stock).toBe(5);
    await expect(updateOrderStatus(String(o._id), "confirmed")).rejects.toThrow();
    expect((await Product.findById(productId))!.stock).toBe(5);
  });
});

describe("coupon de bienvenue", () => {
  it("est généré à l'inscription, 10 %, usage unique, désactivé après usage", async () => {
    await makeProduct(10);
    const user = await registerCustomer({ name: "Alice", email: "alice@example.com", password: "Passw0rdOK" }, "1.1.1.1");
    expect(user.welcomeCouponCode).toMatch(/^WELCOME-[A-Z0-9]{6}$/);
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: user.welcomeCouponCode! }, String(user._id));
    expect(o.discount).toBe(10);
    const c = await Coupon.findOne({ code: user.welcomeCouponCode! });
    expect(c!.usedCount).toBe(1);
    expect(c!.isActive).toBe(false);
    await expect(
      createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: user.welcomeCouponCode! }, String(user._id)),
    ).rejects.toThrow();
  });

  it("refuse le coupon pour un invité ou un autre utilisateur", async () => {
    await makeProduct(10);
    const a = await registerCustomer({ name: "Alice", email: "alice@example.com", password: "Passw0rdOK" }, "1.1.1.1");
    const b = await registerCustomer({ name: "Bob", email: "bob@example.com", password: "Passw0rdOK" }, "2.2.2.2");
    const input = { customer, address, items: [{ productId, quantity: 1 }], couponCode: a.welcomeCouponCode! };
    await expect(createOrder(input, null)).rejects.toThrow(/Connectez-vous/);
    await expect(createOrder(input, String(b._id))).rejects.toThrow(/destiné/);
  });

  it("ne consomme pas le coupon si le stock échoue (rollback)", async () => {
    await makeProduct(0);
    const u = await registerCustomer({ name: "Alice", email: "alice@example.com", password: "Passw0rdOK" }, "1.1.1.1");
    await expect(createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: u.welcomeCouponCode! }, String(u._id))).rejects.toThrow();
    const c = await Coupon.findOne({ code: u.welcomeCouponCode! });
    expect(c!.usedCount).toBe(0);
  });

  it("empêche les comptes multiples (alias gmail, téléphone, IP)", async () => {
    await registerCustomer({ name: "A", email: "john.doe@gmail.com", password: "Passw0rdOK", phone: "+21611111111" }, "9.9.9.9");
    expect(normalizeEmail("j.o.h.n.doe+promo@gmail.com")).toBe("johndoe@gmail.com");
    await expect(registerCustomer({ name: "B", email: "j.ohndoe+2@gmail.com", password: "Passw0rdOK" }, "8.8.8.8")).rejects.toThrow(/existe déjà/);
    await expect(registerCustomer({ name: "C", email: "c@x.com", password: "Passw0rdOK", phone: "+216 11 111 111" }, "8.8.8.8")).rejects.toThrow(/numéro/);
    await registerCustomer({ name: "D", email: "d@x.com", password: "Passw0rdOK" }, "7.7.7.7");
    await registerCustomer({ name: "E", email: "e@x.com", password: "Passw0rdOK" }, "7.7.7.7");
    await registerCustomer({ name: "F", email: "f@x.com", password: "Passw0rdOK" }, "7.7.7.7");
    await expect(registerCustomer({ name: "G", email: "g@x.com", password: "Passw0rdOK" }, "7.7.7.7")).rejects.toThrow(/Trop/);
  });

  it("coupon à usage unique : une seule commande simultanée réussit", async () => {
    await makeProduct(10);
    await Coupon.create({ code: "ONCE", type: "fixed", value: 10, maxUses: 1 });
    const r = await Promise.allSettled(
      Array.from({ length: 5 }, () => createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: "ONCE" }, null)),
    );
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await Product.findById(productId))!.stock).toBe(9); // les échecs ont restitué le stock
  });
});

describe("frais de livraison configurables", () => {
  it("applique les frais enregistrés par l'admin, à la commande et au seuil de gratuité", async () => {
    const { Settings } = await import("@/models/Settings");
    await makeProduct(20);
    await Settings.deleteMany({});
    await Settings.create({ key: "shop", shippingFee: 12, freeShippingThreshold: 250 });
    const paid = await createOrder({ customer, address, items: [{ productId, quantity: 1 }] }, null); // 100 < 250
    expect(paid.shippingFee).toBe(12);
    expect(paid.total).toBe(112);
    const free = await createOrder({ customer, address, items: [{ productId, quantity: 3 }] }, null); // 300 ≥ 250
    expect(free.shippingFee).toBe(0);
    await Settings.updateOne({ key: "shop" }, { shippingFee: 5, freeShippingThreshold: 0 }); // seuil 0 = jamais offerte
    const never = await createOrder({ customer, address, items: [{ productId, quantity: 4 }] }, null);
    expect(never.shippingFee).toBe(5);
    expect(paid.shippingFee).toBe(12); // l'ancienne commande garde ses frais
    await Settings.deleteMany({});
  });
});

describe("coupons : annulation de commande", () => {
  it("un coupon standard à usage limité redevient utilisable quand la commande est annulée", async () => {
    await makeProduct(10);
    await Coupon.create({ code: "LIMIT1", type: "fixed", value: 10, maxUses: 1 });
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: "LIMIT1" }, null);
    await updateOrderStatus(String(o._id), "cancelled");
    const c = await Coupon.findOne({ code: "LIMIT1" });
    expect(c!.usedCount).toBe(0);
    // doit pouvoir être réutilisé
    const again = await createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: "LIMIT1" }, null);
    expect(again.discount).toBe(10);
  });
  it("un coupon désactivé à la main par l'admin reste désactivé après une annulation", async () => {
    await makeProduct(10);
    const c = await Coupon.create({ code: "MANUAL", type: "fixed", value: 5, maxUses: 5 });
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: "MANUAL" }, null);
    await Coupon.updateOne({ _id: c._id }, { isActive: false }); // l'admin le désactive
    await updateOrderStatus(String(o._id), "cancelled");
    expect((await Coupon.findById(c._id))!.isActive).toBe(false);
  });
});

describe("réduction de bienvenue paramétrable", () => {
  it("par défaut : 10 %", async () => {
    const u = await registerCustomer({ name: "Alice", email: "a@example.com", password: "Passw0rdOK" }, "1.1.1.1");
    expect((await Coupon.findOne({ code: u.welcomeCouponCode! }))!.value).toBe(10);
  });
  it("utilise le pourcentage défini par l'admin, sans toucher aux codes déjà émis", async () => {
    const before = await registerCustomer({ name: "Alice", email: "a@example.com", password: "Passw0rdOK" }, "1.1.1.1");
    await Settings.create({ key: "shop", shippingFee: 7, freeShippingThreshold: 150, welcomeDiscountPercent: 25 });
    const after = await registerCustomer({ name: "Bob", email: "b@example.com", password: "Passw0rdOK" }, "2.2.2.2");
    expect((await Coupon.findOne({ code: after.welcomeCouponCode! }))!.value).toBe(25);
    expect((await Coupon.findOne({ code: before.welcomeCouponCode! }))!.value).toBe(10);
    // et la remise est bien appliquée à la commande
    await makeProduct(5);
    const o = await createOrder({ customer, address, items: [{ productId, quantity: 1 }], couponCode: after.welcomeCouponCode! }, String(after._id));
    expect(o.discount).toBe(25);
  });
  it("0 = offre désactivée : aucun code n'est créé", async () => {
    await Settings.create({ key: "shop", shippingFee: 7, freeShippingThreshold: 150, welcomeDiscountPercent: 0 });
    const u = await registerCustomer({ name: "Carl", email: "c@example.com", password: "Passw0rdOK" }, "3.3.3.3");
    expect(u.welcomeCouponCode).toBeUndefined();
    expect(await Coupon.countDocuments({ kind: "welcome" })).toBe(0);
  });
});

describe("alertes de stock bas", () => {
  it("liste les produits actifs sous le seuil (du plus urgent au moins urgent), ignore les inactifs", async () => {
    const { lowStockProducts } = await import("@/services/stats.service");
    const mk = async (name: string, stock: number, isActive = true) => {
      const cat = (await Category.findOne()) ?? (await Category.create({ name: "Test", slug: "test" }));
      return Product.create({ name, slug: `s-${name}-${Math.random()}`, price: 10, category: cat._id, stock, sku: `SKU-${name}-${Math.random()}`, isActive });
    };
    await Promise.all([mk("A-zero", 0), mk("B-trois", 3), mk("C-quatre", 4), mk("D-cinq", 5), mk("E-six", 6), mk("F-inactif", 1, false)]);
    const r = await lowStockProducts(5);
    expect(r.total).toBe(3);
    expect(r.items.map((p) => p.name)).toEqual(["A-zero", "B-trois", "C-quatre"]);
    expect((await lowStockProducts(6)).items.map((p) => p.name)).toContain("D-cinq"); // seuil changé : 5 devient « bas »
    expect((await lowStockProducts(1)).total).toBe(1); // seuil 1 : seulement les ruptures
  });
  it("une commande qui fait passer le stock sous le seuil déclenche l'alerte", async () => {
    const { lowStockProducts } = await import("@/services/stats.service");
    await makeProduct(7);
    expect((await lowStockProducts(5)).total).toBe(0);
    await createOrder({ customer, address, items: [{ productId, quantity: 3 }] }, null); // reste 4
    const r = await lowStockProducts(5);
    expect(r.total).toBe(1);
    expect(r.items[0].stock).toBe(4);
  });
});

describe("image de la couleur commandée", () => {
  it("la ligne de commande garde la photo de la couleur choisie (sinon l'image principale)", async () => {
    await makeProduct(10, {
      images: ["/uploads/principale.webp"],
      variants: [{ name: "Couleur", options: ["Noir", "Marron"], optionImages: [{ option: "Noir", image: "/uploads/noir.webp" }] }],
    });
    const noir = await createOrder({ customer, address, items: [{ productId, quantity: 1, variant: "Noir" }] }, null);
    expect(noir.items[0].image).toBe("/uploads/noir.webp");
    const marron = await createOrder({ customer, address, items: [{ productId, quantity: 1, variant: "Marron" }] }, null);
    expect(marron.items[0].image).toBe("/uploads/principale.webp"); // option sans image
  });
});
