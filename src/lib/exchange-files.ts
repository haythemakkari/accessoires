/** Pièces jointes d'une demande d'échange (photos et messages vocaux du client). Fichier pur : navigateur + serveur. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // ≈ 2 min de voix : reste sous la limite de 4,5 Mo des requêtes Vercel
export const MAX_AUDIO_SECONDS = 120;
export const MAX_ATTACHMENTS_PER_REPLY = 5;
export const MAX_ATTACHMENTS_PER_REQUEST = 30;

export type AttachmentKind = "image" | "audio";
export type Attachment = { kind: AttachmentKind; /** « idClient/nom-fichier.ext » */ name: string; duration?: number | null; size?: number | null };

/** Nom d'une pièce jointe : dossier du client (identifiant) + fichier. Aucun « .. » ni caractère spécial possible. */
export const ATTACHMENT_NAME = /^[a-f\d]{24}\/[\w-]+\.(webp|webm|ogg|mp4|mp3|wav)$/i;
export const attachmentUrl = (name: string) => `/api/exchange-files/${name}`;
export const attachmentKind = (name: string): AttachmentKind => (/\.webp$/i.test(name) ? "image" : "audio");

/** Type réel de l'image d'après ses premiers octets (le type MIME envoyé par le navigateur est falsifiable). */
export function detectImageExt(b: Buffer): "jpg" | "png" | "webp" | "avif" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(b.toString("ascii", 8, 12))) return "avif";
  return null;
}

/** Type réel du message vocal : WebM/Opus (Chrome, Firefox, Android), Ogg, MP4/AAC (Safari, iPhone), MP3, WAV. */
export function detectAudioExt(b: Buffer): "webm" | "ogg" | "mp4" | "mp3" | "wav" | null {
  if (b.length < 12) return null;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  if (b.toString("ascii", 0, 4) === "OggS") return "ogg";
  if (b.toString("ascii", 4, 8) === "ftyp") return "mp4";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE") return "wav";
  if (b.toString("ascii", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "mp3";
  return null;
}

export const CONTENT_TYPES: Record<string, string> = { webp: "image/webp", webm: "audio/webm", ogg: "audio/ogg", mp4: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav" };
