import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Product } = await import("@/models/Product");
const { Category } = await import("@/models/Category");
const { saleStatus } = await import("@/lib/sale");
const { effectivePrice, withPrice } = await import("@/lib/utils");
const { listProducts, upcomingSales } = await import("@/services/product.service");
const { previewCart } = await import("@/services/order.service");
const { hydrateCart } = await import("@/services/cart.service");
const { productSchema, productListQuery } = await import("@/validation/schemas");

const H = 3_600_000;
const D = 24 * H;
const at = (ms: number) => new Date(Date.now() + ms);
let cat: mongoose.Types.ObjectId;
const mk = (name: string, extra: Record<string, unknown> = {}) =>
  Product.create({ name, slug: `${name}-${Math.random()}`.replace(/\s/g, "-"), price: 100, salePrice: 60, isOnSale: true, category: cat, stock: 9, sku: `S-${Math.random()}`, ...extra });
const q = (o: object = {}) => productListQuery.parse({ limit: 50, ...o });

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Category.init()]);
  cat = (await Category.create({ name: "Test", slug: "test" }))._id;
});
beforeEach(async () => { await Product.deleteMany({}); });
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("promotion programmée : états", () => {
  const base = { price: 100, salePrice: 60, isOnSale: true };
  const now = Date.UTC(2026, 9, 12, 12, 0, 0);
  it("sans dates : active tout de suite et sans fin (comportement d'avant)", () => {
    expect(saleStatus(base, now)).toBe("active");
  });
  it("commence plus tard → programmée ; pendant → active ; après la fin → terminée", () => {
    const w = { ...base, saleStartsAt: new Date(now + 2 * D), saleEndsAt: new Date(now + 5 * D) };
    expect(saleStatus(w, now)).toBe("scheduled");
    expect(saleStatus(w, now + 2 * D)).toBe("active"); // à l'instant exact du début
    expect(saleStatus(w, now + 3 * D)).toBe("active");
    expect(saleStatus(w, now + 5 * D)).toBe("ended"); // à l'instant exact de la fin
    expect(saleStatus(w, now + 9 * D)).toBe("ended");
  });
  it("début seul ou fin seule", () => {
    expect(saleStatus({ ...base, saleStartsAt: new Date(now + H) }, now)).toBe("scheduled");
    expect(saleStatus({ ...base, saleStartsAt: new Date(now - H) }, now + 400 * D)).toBe("active");
    expect(saleStatus({ ...base, saleEndsAt: new Date(now + H) }, now)).toBe("active");
  });
  it("interrupteur éteint ou prix promo invalide → aucune promo", () => {
    expect(saleStatus({ ...base, isOnSale: false }, now)).toBe("none");
    expect(saleStatus({ ...base, salePrice: 100 }, now)).toBe("none");
    expect(saleStatus({ ...base, salePrice: null }, now)).toBe("none");
  });
  it("prix effectif et DTO : « isOnSale » = promo en cours, l'interrupteur reste dans saleEnabled", () => {
    const sched = { ...base, saleStartsAt: new Date(Date.now() + 2 * D) };
    expect(effectivePrice(sched)).toBe(100);
    expect(withPrice(sched)).toMatchObject({ currentPrice: 100, isOnSale: false, saleEnabled: true, saleStatus: "scheduled" });
    expect(withPrice(base)).toMatchObject({ currentPrice: 60, isOnSale: true, saleStatus: "active" });
  });
});

describe("promotion programmée : catalogue et accueil", () => {
  it("/products et /promotions : une promo programmée ou terminée n'apparaît pas « en promotion » ; le produit reste listé au prix normal", async () => {
    await mk("En cours", { saleStartsAt: at(-H), saleEndsAt: at(H) });
    await mk("Sans dates");
    await mk("Programmee", { saleStartsAt: at(2 * D), saleEndsAt: at(5 * D) });
    await mk("Terminee", { saleStartsAt: at(-5 * D), saleEndsAt: at(-D) });
    const onSale = (await listProducts(q({ onSale: "true" }))).items.map((p) => p.name).sort();
    expect(onSale).toEqual(["En cours", "Sans dates"]);
    const all = await listProducts(q());
    expect(all.items).toHaveLength(4);
    const byName = Object.fromEntries(all.items.map((p) => [p.name, p]));
    expect(byName["Programmee"]).toMatchObject({ currentPrice: 100, isOnSale: false, saleStatus: "scheduled" });
    expect(byName["Terminee"]).toMatchObject({ currentPrice: 100, isOnSale: false, saleStatus: "ended" });
    expect(byName["En cours"]).toMatchObject({ currentPrice: 60, isOnSale: true });
  });
  it("le filtre « en promotion » se combine avec la recherche sans l'écraser", async () => {
    await mk("Montre en cours", { saleStartsAt: at(-H) });
    await mk("Sac en cours", { saleStartsAt: at(-H) });
    await mk("Montre programmee", { saleStartsAt: at(D) });
    const r = await listProducts(q({ onSale: "true", q: "montre" }));
    expect(r.items.map((p) => p.name)).toEqual(["Montre en cours"]);
  });
  it("l'accueil : les promos à venir, la plus proche d'abord, sans les autres", async () => {
    await mk("Dans 5 jours", { saleStartsAt: at(5 * D) });
    await mk("Dans 2 jours", { saleStartsAt: at(2 * D) });
    await mk("En cours", { saleStartsAt: at(-D) });
    await mk("Sans dates");
    await mk("Interrupteur éteint", { isOnSale: false, saleStartsAt: at(D) });
    await mk("Inactif", { isActive: false, saleStartsAt: at(D) });
    await mk("Prix promo invalide", { salePrice: 100, saleStartsAt: at(D) });
    const up = await upcomingSales(10);
    expect(up.map((p) => p.name)).toEqual(["Dans 2 jours", "Dans 5 jours"]);
    expect(up[0]).toMatchObject({ currentPrice: 100, isOnSale: false, salePrice: 60, saleStatus: "scheduled" });
  });
});

describe("promotion programmée : prix au panier et en commande (calculés par le serveur)", () => {
  it("avant le début : prix normal ; pendant : prix promo ; après la fin : prix normal", async () => {
    const before = await mk("Avant", { saleStartsAt: at(2 * D) });
    const during = await mk("Pendant", { saleStartsAt: at(-H), saleEndsAt: at(H) });
    const after = await mk("Apres", { saleStartsAt: at(-2 * D), saleEndsAt: at(-H) });
    const total = async (p: { _id: unknown }) => (await previewCart([{ productId: String(p._id), quantity: 2 }], undefined, null)).subtotal;
    expect(await total(before)).toBe(200);
    expect(await total(during)).toBe(120);
    expect(await total(after)).toBe(200);
    const [l] = await hydrateCart([{ productId: String(before._id), quantity: 1 }]);
    expect(l).toMatchObject({ price: 100 });
  });
});

describe("promotion programmée : saisie admin", () => {
  const base = { name: "Montre", price: 100, category: "6ac3d838f2a3ae4b031fbc82", stock: 5, isOnSale: true, salePrice: 60 };
  it("accepte des dates (texte ISO ou nulles) et refuse une fin avant le début", () => {
    const ok = productSchema.safeParse({ ...base, saleStartsAt: "2026-10-14T09:00:00.000Z", saleEndsAt: "2026-10-20T21:30:00.000Z" });
    expect(ok.success && ok.data.saleStartsAt instanceof Date).toBe(true);
    expect(productSchema.safeParse({ ...base, saleStartsAt: null, saleEndsAt: null }).success).toBe(true);
    expect(productSchema.safeParse({ ...base }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, saleStartsAt: "2026-10-20T09:00:00.000Z", saleEndsAt: "2026-10-14T09:00:00.000Z" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, saleStartsAt: "pas une date" }).success).toBe(false);
  });
});
