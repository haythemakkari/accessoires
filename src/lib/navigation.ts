import { toSlug } from "./utils";

/** Source unique de la navigation : l'en-tête, le menu mobile et le script de synchronisation des catégories. */
export type NavItem = { label: string; category: string };
export type NavGroup = { label: string; gender: "femme" | "homme"; items: NavItem[] };

const item = (label: string): NavItem => ({ label, category: toSlug(label) });

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Femme",
    gender: "femme",
    items: ["Collier", "Bague", "Montre", "Gourmette", "Bracelet", "Boucle d'oreille", "Sac", "Couffin", "Ceinture", "Casquette"].map(item),
  },
  { label: "Homme", gender: "homme", items: ["Montre", "Portefeuille", "Bracelet", "Casquette"].map(item) },
];

export const groupHref = (g: NavGroup) => `/products?gender=${g.gender}`;
export const itemHref = (g: NavGroup, i: NavItem) => `/products?gender=${g.gender}&category=${i.category}`;

/** Liens utiles du pied de page. */
export const USEFUL_LINKS = [
  { label: "Accueil", href: "/" },
  { label: "Femme", href: "/products?gender=femme" },
  { label: "Homme", href: "/products?gender=homme" },
  { label: "Contact", href: "/contact" },
];

/** Pages du Service client. */
export const SERVICE_LINKS = [
  { label: "FAQ", href: "/service-client/faq" },
  { label: "Livraison", href: "/service-client/livraison" },
  { label: "Retours & Échanges", href: "/service-client/retours-echanges" },
  { label: "Suivi colis", href: "/service-client/suivi-commande" },
];

/** Réseaux sociaux affichés dans le pied de page. */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/accessoires.plus/",
};
