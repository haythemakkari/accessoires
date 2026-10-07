/**
 * Fichiers statiques non fingerprintés (public/) : on ajoute ?v=N et on les met en cache 1 an (immutable).
 * Changer un logo ? Remplacez le fichier ET incrémentez ASSET_VERSION : les navigateurs rechargent le nouveau.
 */
export const ASSET_VERSION = 4; // 4 : logo pied de page pour fond sombre
export const asset = (path: string) => `${path}?v=${ASSET_VERSION}`;
