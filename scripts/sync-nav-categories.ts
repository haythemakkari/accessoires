/** Aligne les catégories de la base sur la navigation (src/lib/navigation.ts) : npm run sync:nav
 *  - renomme les anciennes catégories au pluriel (Montres → Montre…) en conservant leurs produits ;
 *  - crée les catégories manquantes. Idempotent. */
import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Category } from "../src/models/Category";
import { NAV_GROUPS } from "../src/lib/navigation";
import { toSlug } from "../src/lib/utils";

const RENAME: Record<string, string> = { Portefeuilles: "Portefeuille", Bracelets: "Bracelet", Casquettes: "Casquette", Ceintures: "Ceinture", Sacs: "Sac", Montres: "Montre" };

async function main() {
  await connectDB();
  for (const [from, to] of Object.entries(RENAME)) {
    const old = await Category.findOne({ slug: toSlug(from) });
    if (old && !(await Category.exists({ slug: toSlug(to) }))) {
      old.name = to;
      old.slug = toSlug(to);
      await old.save();
      console.log(`↻ ${from} → ${to}`);
    }
  }
  const names = new Map<string, string>();
  for (const g of NAV_GROUPS) for (const i of g.items) names.set(i.category, i.label);
  let order = 0;
  for (const [slug, name] of names) {
    const res = await Category.updateOne({ slug }, { $setOnInsert: { name, slug, isActive: true, sortOrder: order } }, { upsert: true });
    if (res.upsertedCount) console.log(`+ ${name}`);
    order++;
  }
  console.log(`✔ ${names.size} catégories de navigation présentes.`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
