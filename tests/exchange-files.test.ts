import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/accessoires_plus_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
delete process.env.BLOB_READ_WRITE_TOKEN; // stockage sur disque pendant les tests
delete process.env.BLOB_STORE_ID;

const { connectDB } = await import("@/lib/db");
const { Message } = await import("@/models/Message");
const { Order } = await import("@/models/Order");
const { User } = await import("@/models/User");
const { createExchangeRequest, addCustomerReply, deleteExchangeFiles } = await import("@/services/exchange.service");
const { exchangeCustomerReplySchema } = await import("@/validation/schemas");
const { saveUpload, statUpload, deleteUpload } = await import("@/lib/storage");
const { detectAudioExt, detectImageExt, ATTACHMENT_NAME } = await import("@/lib/exchange-files");
const { toCustomerExchange } = await import("@/lib/exchange-dto");

const bytes = (...b: number[]) => Buffer.from([...b, ...new Array(20).fill(0)]);
const ascii = (s: string, at = 0) => { const b = Buffer.alloc(32); b.write(s, at, "ascii"); return b; };
const written: string[] = [];
let alice: string, bob: string;
const put = async (uid: string, file: string) => { const rel = `exchange/${uid}/${file}`; await saveUpload(rel, Buffer.alloc(3000, 1), "audio/webm"); written.push(rel); return `${uid}/${file}`; };
const base = { name: "Alice", phone: "+21620123456", subject: "Demande d'échange", message: "Je souhaite changer la taille de mon article." };

beforeAll(async () => { await connectDB(); await mongoose.connection.dropDatabase(); await Promise.all([Message.init(), Order.init(), User.init()]); });
beforeEach(async () => {
  await Promise.all([Message.deleteMany({}), Order.deleteMany({}), User.deleteMany({})]);
  const mk = (n: string) => User.create({ name: n, email: `${n}@x.com`, emailNormalized: `${n}@x.com`, passwordHash: "x" });
  alice = String((await mk("alice"))._id); bob = String((await mk("bob"))._id);
});
afterAll(async () => { for (const r of written) await deleteUpload(r); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

const makeRequest = async () => {
  await Order.create({ orderNumber: "NM-261012-AAAAAA", user: new mongoose.Types.ObjectId(alice), isGuest: false, status: "delivered", customer: { fullName: "A", phone: "+21620123456" }, address: { line: "12 rue des Tests", city: "Tunis" }, items: [{ product: new mongoose.Types.ObjectId(), name: "Montre", sku: "S1", price: 100, quantity: 1 }], subtotal: 100, total: 100, statusHistory: [{ status: "delivered" }] });
  return createExchangeRequest({ ...base, orderNumber: "NM-261012-AAAAAA" }, { userId: alice, ip: "x" });
};

describe("pièces jointes : détection du vrai format", () => {
  it("reconnaît WebM, Ogg, MP4, WAV et MP3 d'après leurs premiers octets", () => {
    expect(detectAudioExt(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe("webm");
    expect(detectAudioExt(ascii("OggS"))).toBe("ogg");
    expect(detectAudioExt(ascii("ftyp", 4))).toBe("mp4");
    const wav = Buffer.alloc(32); wav.write("RIFF", 0, "ascii"); wav.write("WAVE", 8, "ascii");
    expect(detectAudioExt(wav)).toBe("wav");
    expect(detectAudioExt(ascii("ID3"))).toBe("mp3");
  });
  it("refuse tout le reste : texte, script, exécutable, image déguisée en audio", () => {
    expect(detectAudioExt(Buffer.from("<script>alert(1)</script>............"))).toBeNull();
    expect(detectAudioExt(Buffer.from("MZ\x90\x00 programme windows ............"))).toBeNull();
    expect(detectAudioExt(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBeNull();
    expect(detectAudioExt(Buffer.alloc(5))).toBeNull();
    expect(detectImageExt(ascii("OggS"))).toBeNull();
    expect(detectImageExt(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("jpg");
  });
  it("les noms de pièces jointes n'autorisent ni dossier parent ni extension inconnue", () => {
    const id = "6acbd0517677ec7336e03c25";
    expect(ATTACHMENT_NAME.test(`${id}/1791-ab12cd.webp`)).toBe(true);
    expect(ATTACHMENT_NAME.test(`${id}/1791-ab12cd.webm`)).toBe(true);
    for (const bad of [`${id}/../${id}/x.webp`, `../${id}/x.webp`, `${id}/a/b.webp`, `${id}/x.exe`, `${id}/x.html`, `${id}/x.svg`, `nimporte/x.webp`, `${id}/x.webp?a=1`]) expect(ATTACHMENT_NAME.test(bad)).toBe(false);
  });
});

describe("pièces jointes : validation d'un message du client", () => {
  const id = "6acbd0517677ec7336e03c25";
  const att = (i: number, ext = "webp") => ({ name: `${id}/17${i}-aabbcc.${ext}` });
  it("accepte un texte seul, des pièces jointes seules, ou les deux", () => {
    expect(exchangeCustomerReplySchema.safeParse({ text: "Bonjour, voici la photo." }).success).toBe(true);
    expect(exchangeCustomerReplySchema.safeParse({ attachments: [att(1)] }).success).toBe(true);
    expect(exchangeCustomerReplySchema.safeParse({ text: "Voir photo", attachments: [att(1), att(2), { ...att(3, "webm"), duration: 12 }] }).success).toBe(true);
  });
  it("refuse : message vide, 6 pièces jointes, deux vocaux, nom invalide, vocal trop long", () => {
    expect(exchangeCustomerReplySchema.safeParse({ text: " " }).success).toBe(false);
    expect(exchangeCustomerReplySchema.safeParse({ attachments: [1, 2, 3, 4, 5, 6].map((i) => att(i)) }).success).toBe(false);
    expect(exchangeCustomerReplySchema.safeParse({ attachments: [att(1, "webm"), att(2, "ogg")] }).success).toBe(false);
    expect(exchangeCustomerReplySchema.safeParse({ attachments: [{ name: "../../etc/passwd" }] }).success).toBe(false);
    expect(exchangeCustomerReplySchema.safeParse({ attachments: [{ ...att(1, "webm"), duration: 600 }] }).success).toBe(false);
  });
});

describe("pièces jointes : conversation", () => {
  it("le message du client contient ses pièces jointes (taille relevée dans le stockage)", async () => {
    const m = await makeRequest();
    const photo = await put(alice, "1-aaaaaa.webp");
    const voice = await put(alice, "2-bbbbbb.webm");
    const after = await addCustomerReply(alice, String(m._id), "", [{ name: photo }, { name: voice, duration: 14 }]);
    const r = after!.replies[0];
    expect(r.text).toBe("");
    expect(r.attachments.map((a) => [a.kind, a.name, a.size, a.duration ?? null])).toEqual([["image", photo, 3000, null], ["audio", voice, 3000, 14]]);
  });
  it("refuse un fichier d'un autre client, ou qui n'existe pas dans le stockage", async () => {
    const m = await makeRequest();
    const foreign = await put(bob, "3-cccccc.webp");
    await expect(addCustomerReply(alice, String(m._id), "Voir photo", [{ name: foreign }])).rejects.toMatchObject({ code: "ATTACHMENT_INVALID" });
    await expect(addCustomerReply(alice, String(m._id), "Voir photo", [{ name: `${alice}/inexistant.webp` }])).rejects.toMatchObject({ code: "ATTACHMENT_MISSING" });
    expect((await Message.findById(m._id))!.replies).toHaveLength(0);
  });
  it("plafonne le nombre total de pièces jointes d'une demande", async () => {
    const m = await makeRequest();
    const names: string[] = [];
    for (let i = 0; i < 31; i++) names.push(await put(alice, `lot-${i}.webp`));
    for (let k = 0; k < 6; k++) await addCustomerReply(alice, String(m._id), "lot", names.slice(k * 5, k * 5 + 5).map((name) => ({ name })));
    await expect(addCustomerReply(alice, String(m._id), "de trop", [{ name: names[30] }])).rejects.toMatchObject({ code: "EXCHANGE_ATTACHMENTS_FULL" });
  });
  it("la vue envoyée au client donne une URL privée par pièce jointe, sans chemin de stockage ni IP", async () => {
    const m = await makeRequest();
    const photo = await put(alice, "4-dddddd.webp");
    await addCustomerReply(alice, String(m._id), "photo", [{ name: photo }]);
    const dto = toCustomerExchange((await Message.findById(m._id).lean())! as never);
    expect(dto.replies[0].attachments).toEqual([{ kind: "image", url: `/api/exchange-files/${photo}`, duration: null }]);
    expect(JSON.stringify(dto)).not.toContain("public/uploads");
  });
  it("supprimer une demande supprime aussi ses fichiers", async () => {
    const m = await makeRequest();
    const photo = await put(alice, "5-eeeeee.webp");
    await addCustomerReply(alice, String(m._id), "photo", [{ name: photo }]);
    expect(await statUpload(`exchange/${photo}`)).not.toBeNull();
    await deleteExchangeFiles([(await Message.findById(m._id).lean())!]);
    expect(await statUpload(`exchange/${photo}`)).toBeNull();
  });
});
