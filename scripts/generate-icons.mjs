// Génère les icônes du site et l'image de partage (Open Graph) à partir des logos : node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const INK = { r: 20, g: 17, b: 15, alpha: 1 };
mkdirSync("public/icons", { recursive: true });

// Logo vertical pour fond SOMBRE : les pixels sombres deviennent blancs, le doré est conservé (l'alpha — donc l'anti-crénelage — est inchangé).
{
  const { data, info } = await sharp("public/logo-footer.webp").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const isGold = data[i] - data[i + 2] > 40; // l'or est nettement plus rouge que bleu ; le noir/gris ne l'est pas
    if (!isGold) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  }
  await sharp(data, { raw: info }).webp({ quality: 92, alphaQuality: 100 }).toFile("public/logo-footer-dark.webp");
}

// Monogramme « A » : on isole la lettre (partie haute du logo vertical) puis on la rogne au plus juste.
const upper = await sharp("public/logo-footer.webp").extract({ left: 0, top: 0, width: 400, height: 138 }).png().toBuffer();
const trimmed = await sharp(upper).trim().toBuffer();
const tm = await sharp(trimmed).metadata();
// Silhouette blanche du « A » (le logo vertical est en noir + doré) : on garde sa forme (alpha) et on la remplit de blanc.
const top = await sharp({ create: { width: tm.width, height: tm.height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
  .composite([{ input: trimmed, blend: "dest-in" }]).png().toBuffer(); // (trim s'applique avant extract dans sharp : deux étapes)

async function icon(size, padding = 0.24) {
  const inner = Math.round(size * (1 - padding * 2));
  const glyph = await sharp(top).resize({ height: inner, fit: "inside" }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: INK } }).composite([{ input: glyph, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
}

writeFileSync("src/app/icon.png", await icon(512));
writeFileSync("src/app/apple-icon.png", await icon(180, 0.2));
writeFileSync("public/icons/icon-192.png", await icon(192));
writeFileSync("public/icons/icon-512.png", await icon(512));

// favicon.ico : conteneur ICO avec des PNG 16/32/48 (supporté par tous les navigateurs actuels)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => icon(s, 0.14)));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12); offset += pngs[i].length; return e; });
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

// Image de partage 1200×630 : logo en couleurs (noir + doré) sur fond sable, centré
const SAND = { r: 250, g: 247, b: 242, alpha: 1 };
const logo = await sharp("public/logo.webp").resize({ width: 820 }).toBuffer();
const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: SAND } }).composite([{ input: logo, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
writeFileSync("src/app/opengraph-image.png", og);
writeFileSync("src/app/twitter-image.png", og);
console.log("icônes et image de partage générées");
