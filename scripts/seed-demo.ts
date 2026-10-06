/** Données de DÉMONSTRATION pour le développement local uniquement : npm run seed:demo
 *  Refuse de tourner si NODE_ENV=production. */
import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { toSlug } from "../src/lib/utils";

import { NAV_GROUPS } from "../src/lib/navigation";

// Catégories de la navigation + quelques catégories hors menu (visibles via « Boutique »).
const NAV_CATS = [...new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label)))];
const CATS = [...NAV_CATS, "Lunettes", "Porte-clés", "Bijoux"];
const PRODUCTS: [string, string, "homme" | "femme" | "unisex", number, number?][] = [
  ["Collier pendentif perle", "Collier", "femme", 85], ["Collier chaîne dorée", "Collier", "femme", 65, 49],
  ["Bague solitaire argent", "Bague", "femme", 79], ["Bague fine dorée", "Bague", "femme", 45],
  ["Montre bracelet cuir rose", "Montre", "femme", 219, 179], ["Montre minimaliste acier", "Montre", "homme", 249],
  ["Gourmette maille dorée", "Gourmette", "femme", 69], ["Bracelet jonc doré", "Bracelet", "femme", 59],
  ["Bracelet maille acier", "Bracelet", "homme", 45], ["Boucles d'oreilles dorées", "Boucle d'oreille", "femme", 49],
  ["Sac bandoulière camel", "Sac", "femme", 189, 149], ["Sac cabas toile & cuir", "Sac", "femme", 129],
  ["Couffin tressé naturel", "Couffin", "femme", 95], ["Ceinture cuir fine", "Ceinture", "femme", 55],
  ["Casquette coton sable", "Casquette", "unisex", 39], ["Casquette noire brodée", "Casquette", "homme", 35],
  ["Portefeuille cuir noir", "Portefeuille", "homme", 89], ["Portefeuille compact cognac", "Portefeuille", "homme", 69, 55],
  ["Lunettes aviator noires", "Lunettes", "unisex", 99], ["Porte-clés cuir gravé", "Porte-clés", "unisex", 25],
];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("seed:demo interdit en production");
  await connectDB();
  const cats = new Map<string, mongoose.Types.ObjectId>();
  for (const [i, name] of CATS.entries()) {
    const c = await Category.findOneAndUpdate({ slug: toSlug(name) }, { name, slug: toSlug(name), sortOrder: i, isActive: true }, { upsert: true, returnDocument: "after" });
    cats.set(name, c._id);
  }
  for (const [i, [name, cat, gender, price, sale]] of PRODUCTS.entries()) {
    const slug = toSlug(name);
    // Un produit déjà présent (et peut-être modifié par l'admin) ne change que de catégorie/genre ; le reste n'est posé qu'à la création.
    await Product.updateOne(
      { slug },
      {
        $set: { category: cats.get(cat), gender },
        $setOnInsert: {
          name, slug, description: `${name}. Finitions soignées, pensé pour durer.`, price, isOnSale: !!sale, salePrice: sale,
          stock: 5 + (i % 4) * 5, sku: `NM-${slug.toUpperCase()}`.slice(0, 40), isFeatured: i % 3 === 0, isActive: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`✔ ${CATS.length} catégories et ${PRODUCTS.length} produits de démonstration (sans images : ajoutez-en depuis /admin).`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
