/**
 * Images : les fichiers téléversés (/uploads/xxx) sont servis par la route /media/xxx?w=… qui les redimensionne
 * et les convertit en WebP à la demande (puis met le résultat en cache). Les liens externes (https://…) ne sont pas modifiés.
 * Fichier sans dépendance serveur : utilisable côté navigateur.
 */
export const MEDIA_WIDTHS = [160, 320, 480, 640, 800, 1200, 1600] as const;
export const DEFAULT_MEDIA_WIDTH = 1600;
const LOCAL = /^\/uploads\/([\w.\-]+)$/;

export const isLocalMedia = (src: string) => LOCAL.test(src);

/** URL d'une version redimensionnée (largeur w en pixels, parmi MEDIA_WIDTHS). */
export function mediaUrl(src: string, w?: number) {
  const m = LOCAL.exec(src);
  return m ? `/media/${m[1]}${w ? `?w=${w}` : ""}` : src;
}

/** Attribut srcset : le navigateur choisit la plus petite version suffisante pour l'écran et la densité de pixels. */
export function mediaSrcSet(src: string, widths: readonly number[] = [320, 480, 640, 800, 1200]) {
  return isLocalMedia(src) ? widths.map((w) => `${mediaUrl(src, w)} ${w}w`).join(", ") : undefined;
}
