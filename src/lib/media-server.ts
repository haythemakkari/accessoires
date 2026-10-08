import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";
import { readUpload, statUpload, usesBlob } from "./storage";

export type MediaFormat = "avif" | "webp";
// Sur Vercel seul /tmp est inscriptible (et propre à chaque instance) : le vrai cache est alors le CDN (Cache-Control de /media).
const CACHE_DIR = process.env.VERCEL ? path.join(tmpdir(), "media") : path.join(process.cwd(), ".cache", "media");
const inflight = new Map<string, Promise<Buffer>>();

/** AVIF si le navigateur l'annonce (≈ 30 % plus léger que WebP à qualité visuelle égale), sinon WebP. */
export const pickFormat = (accept: string | null): MediaFormat => (accept?.includes("image/avif") ? "avif" : "webp");

/** Version redimensionnée d'une image téléversée, mise en cache sur disque (clé : nom + largeur + format). */
export async function getVariant(name: string, width: number, format: MediaFormat, srcVersion: number, load: () => Promise<Buffer>): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, `${name}.${width}.${format}`);
  try {
    if ((await stat(cacheFile)).mtimeMs >= srcVersion) return await readFile(cacheFile);
  } catch {}
  const key = `${name}:${width}:${format}`;
  let job = inflight.get(key); // requêtes simultanées pour la même variante : un seul calcul
  if (!job) {
    job = (async () => {
      const img = sharp(await load()).rotate().resize({ width, withoutEnlargement: true });
      const buf = await (format === "avif" ? img.avif({ quality: 52, effort: 4 }) : img.webp({ quality: 76 })).toBuffer();
      try {
        await mkdir(CACHE_DIR, { recursive: true });
        const tmp = `${cacheFile}.${process.pid}.tmp`;
        await writeFile(tmp, buf);
        await rename(tmp, cacheFile);
      } catch (e) {
        console.warn("[media] cache disque indisponible :", (e as Error).message); // l'image est quand même servie
      }
      return buf;
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return job;
}

/** Prépare en arrière-plan les tailles les plus demandées, pour que la 1ʳᵉ visite ne paie pas l'encodage. Inutile avec Blob : le CDN met en cache. */
export function warmVariants(name: string, source: Buffer) {
  if (usesBlob()) return;
  void (async () => {
    try {
      const file = await statUpload(name);
      if (!file) return;
      for (const w of [480, 800]) for (const f of ["avif", "webp"] as const) await getVariant(name, w, f, file.version, async () => source);
    } catch (e) {
      console.warn("[media] préparation des variantes échouée :", name, (e as Error).message);
    }
  })();
}

/** Charge la source d'une image téléversée (disque ou Blob). */
export const loader = (name: string, file: NonNullable<Awaited<ReturnType<typeof statUpload>>>) => () => readUpload(name, file);
