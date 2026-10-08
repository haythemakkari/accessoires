/** Pré-génère les variantes d'images (AVIF + WebP) de tout public/uploads : npm run warm:media
 *  À lancer après un déploiement sur serveur classique. Inutile sur Vercel : le CDN met en cache chaque taille après la 1ʳᵉ visite. */
import { readdir } from "fs/promises";
import { MEDIA_WIDTHS } from "../src/lib/media";
import { getVariant, loader } from "../src/lib/media-server";
import { UPLOAD_DIR, statUpload } from "../src/lib/storage";

async function main() {
  const files = (await readdir(UPLOAD_DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  let n = 0;
  for (const f of files) {
    const file = (await statUpload(f))!;
    for (const w of MEDIA_WIDTHS) for (const fmt of ["avif", "webp"] as const) { await getVariant(f, w, fmt, file.version, loader(f, file)); n++; }
  }
  console.log(`✔ ${files.length} image(s), ${n} variante(s) prêtes.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
