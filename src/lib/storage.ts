import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, del, head, put } from "@vercel/blob";

/**
 * Stockage des fichiers téléversés (images, vidéos), adressés par un chemin relatif : « nom.webp », « videos/nom.mp4 ».
 *  - Développement : disque local (public/uploads).
 *  - Production Vercel (store Blob relié au projet) : Vercel Blob, sous « uploads/… ». Le disque de Vercel est en lecture seule.
 *    Authentification : BLOB_READ_WRITE_TOKEN, ou BLOB_STORE_ID + jeton OIDC fourni par Vercel (nouvelle méthode de connexion).
 *    L'envoi direct de la vidéo depuis le navigateur exige BLOB_READ_WRITE_TOKEN.
 * Les URL enregistrées en base (/uploads/…, /media/video/…) restent identiques dans les deux cas.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
export const usesBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

const blobPath = (rel: string) => `uploads/${rel}`;
const localPath = (rel: string) => path.join(UPLOAD_DIR, rel);

export type StoredFile = { size: number; /** ms : change si le fichier est remplacé */ version: number; /** URL publique (Blob uniquement) */ url?: string };

export async function saveUpload(rel: string, body: Buffer, contentType: string) {
  if (usesBlob()) {
    await put(blobPath(rel), body, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  await mkdir(path.dirname(localPath(rel)), { recursive: true });
  await writeFile(localPath(rel), body);
}

/** Taille et version du fichier, ou null s'il n'existe pas. */
export async function statUpload(rel: string): Promise<StoredFile | null> {
  if (usesBlob()) {
    try {
      const h = await head(blobPath(rel));
      return { size: h.size, version: h.uploadedAt.getTime(), url: h.url };
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
  }
  try {
    const s = await stat(localPath(rel));
    return { size: s.size, version: s.mtimeMs };
  } catch {
    return null;
  }
}

/** Contenu du fichier (ou ses `bytes` premiers octets). */
export async function readUpload(rel: string, file: StoredFile, bytes?: number): Promise<Buffer> {
  if (file.url) {
    const res = await fetch(file.url, bytes ? { headers: { Range: `bytes=0-${bytes - 1}` } } : undefined);
    if (!res.ok) throw new Error(`Lecture du stockage impossible (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  const buf = await readFile(localPath(rel));
  return bytes ? buf.subarray(0, bytes) : buf;
}

export async function deleteUpload(rel: string) {
  if (usesBlob()) await del(blobPath(rel)).catch(() => {});
  else await unlink(localPath(rel)).catch(() => {});
}

/** Chemin Blob accepté pour une vidéo envoyée directement par le navigateur de l'admin. */
export const VIDEO_BLOB_PATH = /^uploads\/videos\/([\w\-]+\.(?:mp4|webm))$/i;
