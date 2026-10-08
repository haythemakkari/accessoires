"use client";
import { upload as blobUpload } from "@vercel/blob/client";

/**
 * Envois de l'admin. Vercel refuse toute requête de plus de 4,5 Mo :
 *  - photos : réduites dans le navigateur si elles sont lourdes, puis envoyées UNE PAR REQUÊTE (le serveur les optimise ensuite) ;
 *  - vidéo : envoyée directement à Vercel Blob quand il est configuré, sinon à la route classique (disque local).
 */
const SHRINK_ABOVE = 3 * 1024 * 1024;
const MAX_SIDE = 2400;

/** Photo de plus de 3 Mo (téléphone, appareil photo) → JPEG 2400 px max (~0,5 à 1,5 Mo). En cas d'échec, l'original est envoyé tel quel. */
async function shrink(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE || typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function post<T>(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(new Error(body.error ?? (xhr.status === 413 ? "Fichier trop lourd" : "Échec de l'envoi")));
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi"));
    xhr.send(form);
  });
}

/** Envoie des photos ; renvoie leurs URL (/uploads/…) dans l'ordre. onProgress : pourcentage global 0–100. */
export async function uploadImages(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
  const urls: string[] = [];
  for (const [i, original] of files.entries()) {
    const form = new FormData();
    form.append("files", await shrink(original));
    const r = await post<{ urls: string[] }>("/api/admin/upload", form, (f) => onProgress?.(Math.round(((i + f) / files.length) * 100)));
    urls.push(...r.urls);
  }
  return urls;
}

/** Envoie la vidéo d'accueil ; renvoie son URL (/media/video/…). */
export async function uploadVideo(file: File, direct: boolean, onProgress?: (pct: number) => void): Promise<string> {
  if (!direct) {
    const form = new FormData();
    form.append("file", file);
    return (await post<{ url: string }>("/api/admin/upload-video", form, (f) => onProgress?.(Math.round(f * 100)))).url;
  }
  if (file.size > 25 * 1024 * 1024) throw new Error(`Vidéo trop lourde (${Math.round(file.size / 1048576)} Mo) : 25 Mo maximum. Choisissez une vidéo plus courte ou compressée.`);
  const ext = /webm$/i.test(file.type) || /\.webm$/i.test(file.name) ? "webm" : "mp4";
  const name = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}.${ext}`;
  try {
    await blobUpload(`uploads/videos/${name}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload-video",
      contentType: ext === "webm" ? "video/webm" : "video/mp4",
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
  } catch (e) {
    throw new Error(/content type/i.test((e as Error).message) ? "Format non supporté : utilisez une vidéo MP4 (H.264) ou WebM." : (e as Error).message || "Échec de l'envoi");
  }
  return `/media/video/${name}`;
}
