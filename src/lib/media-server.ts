import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export type MediaFormat = "avif" | "webp";
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const CACHE_DIR = path.join(process.cwd(), ".cache", "media");
const inflight = new Map<string, Promise<Buffer>>();

/** AVIF si le navigateur l'annonce (≈ 30 % plus léger que WebP à qualité visuelle égale), sinon WebP. */
export const pickFormat = (accept: string | null): MediaFormat => (accept?.includes("image/avif") ? "avif" : "webp");

/** Version redimensionnée d'une image téléversée, mise en cache sur disque (clé : nom + largeur + format). */
export async function getVariant(name: string, width: number, format: MediaFormat, srcMtime: number): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, `${name}.${width}.${format}`);
  try {
    if ((await stat(cacheFile)).mtimeMs >= srcMtime) return await readFile(cacheFile);
  } catch {}
  const key = `${name}:${width}:${format}`;
  let job = inflight.get(key); // requêtes simultanées pour la même variante : un seul calcul
  if (!job) {
    job = (async () => {
      const img = sharp(path.join(UPLOAD_DIR, name)).rotate().resize({ width, withoutEnlargement: true });
      const buf = await (format === "avif" ? img.avif({ quality: 52, effort: 4 }) : img.webp({ quality: 76 })).toBuffer();
      await mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${cacheFile}.${process.pid}.tmp`;
      await writeFile(tmp, buf);
      await rename(tmp, cacheFile);
      return buf;
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return job;
}

/** Prépare en arrière-plan les tailles les plus demandées, pour que la 1ʳᵉ visite ne paie pas l'encodage. */
export function warmVariants(name: string) {
  void (async () => {
    try {
      const mtime = (await stat(path.join(UPLOAD_DIR, name))).mtimeMs;
      for (const w of [480, 800]) for (const f of ["avif", "webp"] as const) await getVariant(name, w, f, mtime);
    } catch (e) {
      console.warn("[media] préparation des variantes échouée :", name, (e as Error).message);
    }
  })();
}
