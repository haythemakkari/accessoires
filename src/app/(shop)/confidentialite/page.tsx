import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/shop/InfoPage";
import { getShopSettings } from "@/lib/data";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Quelles données personnelles nous collectons, pourquoi, combien de temps nous les conservons et comment exercer vos droits.",
  alternates: { canonical: "/confidentialite" },
};

const UPDATED = "10 octobre 2026";

export default async function ConfidentialitePage() {
  const s = await getShopSettings();
  const name = env.siteName;
  return (
    <InfoPage title="Politique de confidentialité" intro={`Cette page explique comment ${name} utilise vos données personnelles. Dernière mise à jour : ${UPDATED}.`}>
      <section>
        <h2 className="h-display text-2xl text-ink">Qui sommes-nous ?</h2>
        <p className="mt-2">{name} est une boutique en ligne d’accessoires de mode qui livre en Tunisie, avec paiement à la livraison. Le responsable du traitement de vos données est {name}{s.contactEmail && <>, joignable à <a className="underline" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></>}{s.contactPhone && <> ou au {s.contactPhone}</>}.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Les données que nous collectons</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Commande :</strong> nom, numéro de téléphone, adresse de livraison (gouvernorat, ville, adresse), email (facultatif) et contenu de la commande.</li>
          <li><strong>Compte client :</strong> nom, email, téléphone (facultatif) et mot de passe, que nous ne conservons jamais en clair (il est transformé de façon irréversible).</li>
          <li><strong>Connexion avec Google :</strong> si vous choisissez « Continuer avec Google », nous recevons uniquement votre <strong>nom</strong>, votre <strong>adresse email</strong> et un identifiant Google, pour créer ou retrouver votre compte. Nous n’avons accès ni à votre mot de passe Google, ni à vos contacts, ni à vos autres services Google.</li>
          <li><strong>Panier :</strong> les articles de votre panier, conservés dans votre navigateur et, si vous êtes connecté, sur votre compte pour les retrouver sur un autre appareil.</li>
          <li><strong>Messages :</strong> les informations que vous nous envoyez via le formulaire de contact.</li>
          <li><strong>Données techniques :</strong> adresse IP, utilisée uniquement pour la sécurité (limitation des tentatives de connexion et des inscriptions abusives).</li>
        </ul>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Pourquoi nous les utilisons</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Traiter, livrer et suivre vos commandes, et vous contacter à leur sujet.</li>
          <li>Gérer votre compte client et votre code de bienvenue.</li>
          <li>Répondre à vos messages et assurer le service client.</li>
          <li>Protéger le site contre les abus et la fraude.</li>
        </ul>
        <p className="mt-2">Nous ne vendons pas vos données et ne les utilisons pas pour de la publicité.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Cookies et stockage local</h2>
        <p className="mt-2">Le site utilise uniquement des témoins nécessaires à son fonctionnement : un cookie de session sécurisé quand vous êtes connecté, un cookie temporaire pendant la connexion avec Google, et le stockage de votre navigateur pour mémoriser votre panier. Aucun cookie publicitaire ou de suivi tiers n’est utilisé.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Avec qui nous les partageons</h2>
        <p className="mt-2">Vos données ne sont partagées qu’avec les prestataires techniques nécessaires au fonctionnement du site (hébergement, base de données et stockage des images), et avec le transporteur pour la livraison de votre colis. Si vous utilisez « Continuer avec Google », Google reçoit uniquement l’information que vous vous connectez à {name}.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Combien de temps nous les conservons</h2>
        <p className="mt-2">Les commandes sont conservées le temps nécessaire à leur suivi et à nos obligations comptables. Votre compte et vos informations restent conservés tant que votre compte est ouvert. Un panier non modifié pendant 60 jours est supprimé automatiquement.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Vos droits</h2>
        <p className="mt-2">Vous pouvez demander l’accès à vos données, leur correction ou leur suppression (y compris celle de votre compte), en nous écrivant{s.contactEmail ? <> à <a className="underline" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></> : <> via la page <Link className="underline" href="/contact">Contact</Link></>}. Vous pouvez aussi modifier vos informations à tout moment depuis « Mon compte ». Pour retirer l’accès de {name} à votre compte Google, rendez-vous sur la page de sécurité de votre compte Google, rubrique « Connexion avec Google ».</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Sécurité</h2>
        <p className="mt-2">Les échanges avec le site sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair et l’accès à l’administration est strictement réservé.</p>
      </section>
      <section>
        <h2 className="h-display text-2xl text-ink">Nous contacter</h2>
        <p className="mt-2">Pour toute question sur cette politique, utilisez la page <Link className="underline" href="/contact">Contact</Link>. Nous pouvons mettre à jour cette page ; la date de dernière mise à jour figure en haut.</p>
      </section>
    </InfoPage>
  );
}
