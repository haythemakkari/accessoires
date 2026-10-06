/** Crée (ou promeut) le compte administrateur : npm run seed:admin
 *  Lit ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME dans .env.local */
import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { User } from "../src/models/User";
import { normalizeEmail } from "../src/lib/utils";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis");
  if (password.length < 8 || password === "ChangeMe-Str0ng-Password!") throw new Error("Choisissez un ADMIN_PASSWORD fort (≥ 8 caractères, différent de l'exemple)");
  await connectDB();
  const emailNormalized = normalizeEmail(email);
  // Si l'email a changé, on met à jour l'admin existant (un seul admin) plutôt que d'en créer un second.
  const existing = (await User.findOne({ emailNormalized })) ?? (await User.findOne({ role: "admin" }));
  if (existing) {
    existing.role = "admin";
    existing.email = email;
    existing.emailNormalized = emailNormalized;
    existing.passwordHash = await hashPassword(password);
    existing.tokenVersion += 1;
    await existing.save();
    console.log(`✔ Compte existant promu administrateur : ${email}`);
  } else {
    await User.create({ name: process.env.ADMIN_NAME ?? "Administrateur", email, emailNormalized, passwordHash: await hashPassword(password), role: "admin" });
    console.log(`✔ Administrateur créé : ${email}`);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
