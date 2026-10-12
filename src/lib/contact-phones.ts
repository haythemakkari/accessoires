/** Numéros de téléphone de la boutique : plusieurs numéros, dont un (facultatif) est le numéro WhatsApp. Fichier pur : navigateur + serveur. */
export const MAX_CONTACT_PHONES = 5;

type Stored = { contactPhone?: string | null; contactPhones?: string[] | null; whatsappPhone?: string | null };

/**
 * Liste des numéros (le 1ᵉʳ est le principal) et numéro WhatsApp.
 *  - ancien réglage (un seul numéro, pas de liste) : la liste contient ce numéro ;
 *  - WhatsApp jamais choisi par l'admin (valeur absente) : on garde l'ancien comportement, c'est le 1ᵉʳ numéro ;
 *  - WhatsApp explicitement « aucun » (chaîne vide) : pas de bouton WhatsApp.
 */
export function resolveContactPhones(s: Stored) {
  const list = (s.contactPhones?.length ? s.contactPhones : s.contactPhone ? [s.contactPhone] : []).filter(Boolean);
  const whatsapp = s.whatsappPhone == null ? (list[0] ?? "") : list.includes(s.whatsappPhone) ? s.whatsappPhone : "";
  return { phones: list, primary: list[0] ?? "", whatsapp };
}

/** Chiffres seuls (« +21620123456 » → « 21620123456 ») pour les liens wa.me et tel:. */
export const phoneDigits = (p: string) => p.replace(/\D/g, "");
