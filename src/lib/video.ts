const MP4_BRANDS = ["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V "];

/** Nombre d'octets suffisant pour reconnaître le format. */
export const VIDEO_SIGNATURE_BYTES = 16;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 Mo : une vidéo d'accueil courte (5–15 s) pèse typiquement 2 à 10 Mo

/** Détecte le format réel par signature (le type MIME envoyé par le navigateur est falsifiable). */
export function detectVideoExt(b: Buffer): "mp4" | "webm" | null {
  if (b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp" && MP4_BRANDS.includes(b.toString("ascii", 8, 12))) return "mp4";
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  return null;
}
