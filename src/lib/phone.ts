/**
 * Numéros tunisiens : 8 chiffres, avec indicatif facultatif (+216, 00216 ou 216).
 * Premier chiffre : 2, 4, 5, 9 (mobiles) · 3, 7 (fixes). Aucune dépendance : utilisable côté navigateur et serveur.
 * Retourne la forme canonique « +216XXXXXXXX », ou null si le numéro est invalide.
 */
export function parseTunisianPhone(input: string): string | null {
  let d = input.trim().replace(/[\s.\-()]/g, "");
  if (d.startsWith("+216")) d = d.slice(4);
  else if (d.startsWith("00216")) d = d.slice(5);
  else if (d.startsWith("216") && d.length === 11) d = d.slice(3);
  return /^[234579]\d{7}$/.test(d) ? `+216${d}` : null;
}

export const PHONE_ERROR = "Numéro tunisien invalide (8 chiffres, ex. 20 123 456)";

/** Mise en forme d'affichage : +216 20 123 456 */
export function formatTunisianPhone(p: string) {
  const c = parseTunisianPhone(p);
  return c ? `+216 ${c.slice(4, 6)} ${c.slice(6, 9)} ${c.slice(9)}` : p;
}
