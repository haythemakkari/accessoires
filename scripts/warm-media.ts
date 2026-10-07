/** Pré-génère les variantes d'images (AVIF + WebP) de tout public/uploads : npm run warm:media
 *  À lancer après un déploiement (ou une restauration) pour que la 1ʳᵉ visite ne paie pas l'encodage. */
import { readdir, stat } from "fs/promises";
import { MEDIA_WIDTHS } from "../src/lib/media";
import { UPLOAD_DIR, getVariant } from "../src/lib/media-server";

async function main() {
  const files = (await readdir(UPLOAD_DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
  let n = 0;
  for (const f of files) {
    const mtime = (await stat(`${UPLOAD_DIR}/${f}`)).mtimeMs;
    for (const w of MEDIA_WIDTHS) for (const fmt of ["avif", "webp"] as const) { await getVariant(f, w, fmt, mtime); n++; }
  }
  console.log(`✔ ${files.length} image(s), ${n} variante(s) prêtes.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
