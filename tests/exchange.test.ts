import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const { connectDB } = await import("@/lib/db");
const { Message } = await import("@/models/Message");
const { Order } = await import("@/models/Order");
const { User } = await import("@/models/User");
const { contactMessageSchema, exchangeReplySchema } = await import("@/validation/schemas");
const { createExchangeRequest, addAdminReply, addCustomerReply, customerExchanges, markExchangeSeen } = await import("@/services/exchange.service");
const { isWithinExchangeWindow, isExchangeable, deliveredAt, EXCHANGE_MAX_REPLIES } = await import("@/lib/exchange");
const { toCustomerExchange } = await import("@/lib/exchange-dto");

let alice: string, bob: string;
const mkOrder = (orderNumber: string, user: string | null, status: "delivered" | "cancelled" | "shipped" = "delivered") =>
  Order.create({
    orderNumber, user: user ? new mongoose.Types.ObjectId(user) : null, isGuest: !user, status,
    customer: { fullName: "Client", phone: "+21612345678" }, address: { line: "12 rue des Tests", city: "Tunis" },
    items: [{ product: new mongoose.Types.ObjectId(), name: "Montre", sku: "S1", price: 100, quantity: 1 }], subtotal: 100, total: 100, statusHistory: [{ status }],
  });
const base = { name: "Alice", phone: "+21620123456", subject: "Demande d'échange", message: "Je souhaite changer la taille de mon article." };

beforeAll(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all([Message.init(), Order.init(), User.init()]);
});
beforeEach(async () => {
  await Promise.all([Message.deleteMany({}), Order.deleteMany({}), User.deleteMany({})]);
  const mk = (n: string) => User.create({ name: n, email: `${n}@x.com`, emailNormalized: `${n}@x.com`, passwordHash: "x" });
  alice = String((await mk("alice"))._id); bob = String((await mk("bob"))._id);
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe("demande d'échange : validation", () => {
  it("le numéro de commande est obligatoire pour un échange, pas pour un message normal", () => {
    const ok = { ...base, orderNumber: "NM-261010-ABC123" };
    expect(contactMessageSchema.safeParse({ ...ok, kind: "exchange" }).success).toBe(true);
    expect(contactMessageSchema.safeParse({ ...base, kind: "exchange" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base }).success).toBe(true); // contact : comme avant
    expect(contactMessageSchema.safeParse({ ...base, kind: "autre" }).success).toBe(false);
  });
  it("réponse de l'admin : 2 à 2000 caractères", () => {
    expect(exchangeReplySchema.safeParse({ text: "ok" }).success).toBe(true);
    expect(exchangeReplySchema.safeParse({ text: " " }).success).toBe(false);
    expect(exchangeReplySchema.safeParse({ text: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("demande d'échange : création", () => {
  it("rattache la demande au compte connecté et à la commande", async () => {
    const o = await mkOrder("NM-261010-AAAAAA", alice);
    const m = await createExchangeRequest({ ...base, orderNumber: "nm-261010-aaaaaa" }, { userId: alice, ip: "1.1.1.1" });
    expect(m).toMatchObject({ kind: "exchange", status: "open", isRead: false, orderNumber: "NM-261010-AAAAAA" });
    expect(String(m.user)).toBe(alice);
    expect(String(m.order)).toBe(String(o._id));
  });
  it("accepte une commande invité, avec ou sans compte connecté", async () => {
    await mkOrder("NM-261010-BBBBBB", null);
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-BBBBBB" }, { userId: null, ip: "x" })).resolves.toBeTruthy();
  });
  it("refuse une commande inconnue, annulée ou appartenant à un autre compte", async () => {
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-CCCCCC" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
    await mkOrder("NM-261010-DDDDDD", alice, "cancelled");
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-DDDDDD" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "ORDER_CANCELLED" });
    await mkOrder("NM-261010-EEEEEE", bob);
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-EEEEEE" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
  });
  it("une seule demande en cours par commande ; une demande clôturée permet d'en refaire une", async () => {
    await mkOrder("NM-261010-FFFFFF", alice);
    const first = await createExchangeRequest({ ...base, orderNumber: "NM-261010-FFFFFF" }, { userId: alice, ip: "x" });
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-FFFFFF" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "EXCHANGE_EXISTS" });
    await Message.updateOne({ _id: first._id }, { status: "closed" });
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-FFFFFF" }, { userId: alice, ip: "x" })).resolves.toBeTruthy();
  });
});

describe("demande d'échange : réponses et espace client", () => {
  it("la réponse de l'admin passe la demande à « répondue » et prévient le client ; l'ouverture le marque vu", async () => {
    await mkOrder("NM-261010-111111", alice);
    const m = await createExchangeRequest({ ...base, orderNumber: "NM-261010-111111" }, { userId: alice, ip: "x" });
    const after = await addAdminReply(String(m._id), "Bonjour, merci de nous renvoyer l'article.");
    expect(after).toMatchObject({ status: "answered", isRead: true, customerUnread: true });
    expect(after.replies).toHaveLength(1);
    expect(after.replies[0]).toMatchObject({ from: "admin", text: "Bonjour, merci de nous renvoyer l'article." });
    const mine = await customerExchanges(alice);
    expect(mine[0].customerUnread).toBe(true);
    await markExchangeSeen(alice, String(m._id));
    expect((await customerExchanges(alice))[0].customerUnread).toBe(false);
  });
  it("un client ne voit ni n'ouvre les demandes des autres", async () => {
    await mkOrder("NM-261010-222222", alice);
    const m = await createExchangeRequest({ ...base, orderNumber: "NM-261010-222222" }, { userId: alice, ip: "x" });
    expect(await customerExchanges(bob)).toHaveLength(0);
    await expect(markExchangeSeen(bob, String(m._id))).rejects.toBeTruthy();
  });
  it("répondre à un message de contact ordinaire est impossible", async () => {
    const c = await Message.create({ ...base, subject: "Question" });
    await expect(addAdminReply(String(c._id), "Bonjour")).rejects.toBeTruthy();
  });
  it("la vue client ne contient ni adresse IP ni champs internes", async () => {
    await mkOrder("NM-261010-333333", alice);
    const m = await createExchangeRequest({ ...base, orderNumber: "NM-261010-333333" }, { userId: alice, ip: "9.9.9.9" });
    await addAdminReply(String(m._id), "Réponse");
    const dto = toCustomerExchange((await customerExchanges(alice))[0] as never);
    expect(JSON.stringify(dto)).not.toContain("9.9.9.9");
    expect(Object.keys(dto).sort()).toEqual(["createdAt", "id", "message", "orderNumber", "replies", "status", "subject", "unread"]);
  });
});

describe("délai de 7 jours après la livraison", () => {
  const daysAgo = (n: number) => Date.now() - n * 86_400_000;
  it("la règle : jusqu'à 7 jours après le passage en « livrée »", () => {
    expect(isWithinExchangeWindow(daysAgo(0))).toBe(true);
    expect(isWithinExchangeWindow(daysAgo(6.9))).toBe(true);
    expect(isWithinExchangeWindow(daysAgo(7.1))).toBe(false);
  });
  it("seule une commande livrée est échangeable ; la date de livraison est celle du dernier passage à « livrée »", () => {
    const hist = (status: string, d: number) => ({ status, at: new Date(daysAgo(d)) });
    expect(isExchangeable({ status: "shipped", statusHistory: [hist("pending", 9), hist("shipped", 1)] })).toBe(false);
    expect(isExchangeable({ status: "cancelled", statusHistory: [hist("delivered", 1), hist("cancelled", 0)] })).toBe(false);
    expect(isExchangeable({ status: "delivered", statusHistory: [hist("pending", 20), hist("delivered", 2)] })).toBe(true); // commandée il y a 20 j, livrée il y a 2 j
    expect(isExchangeable({ status: "delivered", statusHistory: [hist("pending", 3), hist("delivered", 9)] })).toBe(false);
    // repassée en « livrée » plus tard : la dernière date compte
    expect(deliveredAt({ status: "delivered", statusHistory: [hist("delivered", 10), hist("shipped", 5), hist("delivered", 1)] })!.getTime()).toBeGreaterThan(daysAgo(2));
    // ancienne commande sans historique : date de dernière mise à jour
    expect(isExchangeable({ status: "delivered", statusHistory: [], updatedAt: new Date(daysAgo(1)) })).toBe(true);
  });
  it("le serveur refuse : commande pas encore livrée, ou livrée il y a plus de 7 jours, même saisie à la main", async () => {
    await mkOrder("NM-261010-666666", alice, "shipped");
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-666666" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "ORDER_NOT_DELIVERED" });
    const o = await mkOrder("NM-261010-777777", alice);
    await Order.collection.updateOne({ _id: o._id }, { $set: { "statusHistory.0.at": new Date(daysAgo(8)) } });
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-777777" }, { userId: alice, ip: "x" })).rejects.toMatchObject({ code: "EXCHANGE_WINDOW" });
    const old = await mkOrder("NM-261010-888888", alice); // passée il y a 30 jours mais livrée hier : acceptée
    await Order.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(daysAgo(30)), "statusHistory.0.at": new Date(daysAgo(1)) } });
    await expect(createExchangeRequest({ ...base, orderNumber: "NM-261010-888888" }, { userId: alice, ip: "x" })).resolves.toBeTruthy();
  });
});

describe("conversation : réponses du client", () => {
  const setup = async (userId = alice) => {
    await mkOrder("NM-261010-999999", alice);
    return createExchangeRequest({ ...base, orderNumber: "NM-261010-999999" }, { userId, ip: "x" });
  };
  it("le client répond : la demande redevient « à traiter » et non lue pour l'admin", async () => {
    const m = await setup();
    await addAdminReply(String(m._id), "Bonjour, quelle taille souhaitez-vous ?");
    await Message.updateOne({ _id: m._id }, { isRead: true });
    const after = await addCustomerReply(alice, String(m._id), "La taille M, merci.");
    expect(after).toMatchObject({ status: "open", isRead: false, customerUnread: false });
    expect(after!.replies.map((r) => r.from)).toEqual(["admin", "customer"]);
    expect(after!.replies[1].text).toBe("La taille M, merci.");
  });
  it("un client ne peut pas écrire dans la demande d'un autre, ni dans un message de contact", async () => {
    const m = await setup();
    await expect(addCustomerReply(bob, String(m._id), "Intrusion")).rejects.toBeTruthy();
    const c = await Message.create({ ...base, subject: "Question", user: new mongoose.Types.ObjectId(alice) });
    await expect(addCustomerReply(alice, String(c._id), "Hors échange")).rejects.toBeTruthy();
  });
  it("on ne répond pas dans une demande clôturée", async () => {
    const m = await setup();
    await Message.updateOne({ _id: m._id }, { status: "closed" });
    await expect(addCustomerReply(alice, String(m._id), "Encore un message")).rejects.toMatchObject({ code: "EXCHANGE_CLOSED" });
  });
  it("la conversation est plafonnée", async () => {
    const m = await setup();
    await Message.updateOne({ _id: m._id }, { $set: { replies: Array.from({ length: EXCHANGE_MAX_REPLIES }, () => ({ from: "customer", text: "x" })) } });
    await expect(addCustomerReply(alice, String(m._id), "Un de plus")).rejects.toMatchObject({ code: "EXCHANGE_FULL" });
  });
  it("une demande sans compte (invité) ne peut pas recevoir de réponse client", async () => {
    await mkOrder("NM-261010-AAAAA1", null);
    const m = await createExchangeRequest({ ...base, orderNumber: "NM-261010-AAAAA1" }, { userId: null, ip: "x" });
    await expect(addCustomerReply(alice, String(m._id), "Je ne suis pas le propriétaire")).rejects.toBeTruthy();
  });
});
