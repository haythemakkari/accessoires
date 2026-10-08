/** Copie la boutique locale vers la production : npm run migrate:prod
 *
 *  1. Base : toutes les collections de MONGODB_URI (.env.local) → TARGET_MONGODB_URI (MongoDB Atlas), index compris.
 *  2. Fichiers : public/uploads (photos + vidéos) → Vercel Blob (BLOB_READ_WRITE_TOKEN), aux mêmes chemins : les URL en base restent valables.
 *
 *  TARGET_MONGODB_URI et BLOB_READ_WRITE_TOKEN se mettent dans .env.migrate (jamais dans .env.local : le site local passerait sur Blob).
 *  Par sécurité, la copie de la base refuse une base cible non vide ; --replace la vide d'abord.
 *  Options : --skip-db, --skip-files, --replace
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { readdir, readFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { put } from "@vercel/blob";
import { UPLOAD_DIR } from "../src/lib/storage";
import { Cart } from "../src/models/Cart";
import { Category } from "../src/models/Category";
import { Coupon } from "../src/models/Coupon";
import { Message } from "../src/models/Message";
import { Order } from "../src/models/Order";
import { Product } from "../src/models/Product";
import { Settings } from "../src/models/Settings";
import { User } from "../src/models/User";

const target = config({ path: ".env.migrate", processEnv: {}, quiet: true }).parsed ?? {};
const args = new Set(process.argv.slice(2));
const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm" };

async function copyDatabase() {
  const sourceUri = process.env.MONGODB_URI;
  const targetUri = target.TARGET_MONGODB_URI;
  if (!sourceUri) throw new Error("MONGODB_URI manquant dans .env.local");
  if (!targetUri) throw new Error("TARGET_MONGODB_URI manquant dans .env.migrate");
  if (sourceUri === targetUri) throw new Error("La base source et la base cible sont identiques");

  const source = await mongoose.createConnection(sourceUri).asPromise();
  await mongoose.connect(targetUri); // les modèles (et donc leurs index) sont liés à cette connexion
  const src = source.db!;
  const dst = mongoose.connection.db!;
  console.log(`Base : ${src.databaseName} (local) → ${dst.databaseName} (production)`);

  const names = (await src.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith("system."));
  const nonEmpty = [];
  for (const n of names) if (await dst.collection(n).estimatedDocumentCount()) nonEmpty.push(n);
  if (nonEmpty.length) {
    if (!args.has("--replace")) throw new Error(`La base cible contient déjà des données (${nonEmpty.join(", ")}). Relancez avec --replace pour la remplacer.`);
    for (const n of nonEmpty) await dst.collection(n).drop();
    console.log(`  base cible vidée : ${nonEmpty.join(", ")}`);
  }

  // Index d'abord (uniques, TTL du panier…), comme les crée l'application.
  for (const m of [User, Category, Product, Order, Coupon, Settings, Message, Cart] as mongoose.Model<unknown>[]) await m.createIndexes();

  for (const n of names) {
    const docs = await src.collection(n).find().toArray();
    for (let i = 0; i < docs.length; i += 500) await dst.collection(n).insertMany(docs.slice(i, i + 500), { ordered: true });
    console.log(`  ${n} : ${docs.length}`);
  }
  await source.close();
  await mongoose.disconnect();
}

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory()) out.push(...(await listFiles(path.join(dir, e.name), `${prefix}${e.name}/`)));
    else if (TYPES[path.extname(e.name).toLowerCase()]) out.push(prefix + e.name);
  }
  return out;
}

async function copyFiles() {
  const token = target.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN manquant dans .env.migrate");
  const files = await listFiles(UPLOAD_DIR);
  console.log(`Fichiers : ${files.length} → Vercel Blob`);
  let bytes = 0;
  for (const [i, rel] of files.entries()) {
    const body = await readFile(path.join(UPLOAD_DIR, rel));
    await put(`uploads/${rel}`, body, { access: "public", token, contentType: TYPES[path.extname(rel).toLowerCase()], addRandomSuffix: false, allowOverwrite: true });
    bytes += body.length;
    process.stdout.write(`\r  ${i + 1}/${files.length}`);
  }
  console.log(`\n  ${(bytes / 1048576).toFixed(1)} Mo envoyés`);
}

async function main() {
  if (!args.has("--skip-db")) await copyDatabase();
  if (!args.has("--skip-files")) await copyFiles();
  console.log("✔ Migration terminée");
}
main().catch((e) => {
  console.error("✖", (e as Error).message);
  process.exit(1);
});
