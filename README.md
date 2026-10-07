# Accessoires Plus — boutique e-commerce d'accessoires de mode

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MongoDB/Mongoose · Zod · JWT (jose) en cookie httpOnly.

## Démarrage

```bash
npm install
cp .env.example .env.local        # renseigner MONGODB_URI, JWT_SECRET (openssl rand -base64 48), ADMIN_*
npm run seed:admin                # crée (ou met à jour) l'administrateur : ADMIN_EMAIL / ADMIN_PASSWORD
npm run sync:nav                  # aligne les catégories de la base sur le menu (Femme / Homme)
npm run seed:demo                 # (dev uniquement) produits d'exemple, sans images
npm run dev                       # http://localhost:3000  ·  admin : /admin
npm test                          # tests métier (MongoDB local requis, base `accessoires_plus_test`)
npm run build && npm start        # production
```

## Fonctionnalités

- **Boutique** : accueil, catalogue (filtres, tri, recherche, pagination), fiche produit (galerie, zoom, variantes), **panier persistant** (conservé à la fermeture du navigateur ; au retour il est remis à jour — produit retiré, prix ou stock changés — et le client est accueilli par « Votre panier vous attend » ; un client connecté le retrouve sur n'importe quel appareil ; un panier abandonné depuis 30 jours est vidé, 60 jours côté compte), panier sans compte, checkout 3 étapes avec choix du **gouvernorat** (24) et **téléphone tunisien** contrôlé, confirmation, promotions.
- **Compte client** : tableau de bord (avec le code de bienvenue), commandes, informations personnelles + changement de mot de passe sur la même page. Code de bienvenue (`WELCOME-XXXXXX`, −10 % par défaut, réglable ou désactivable par l'admin ; usage unique, lié au compte).
- **Service client** : FAQ, Livraison, Retours & Échanges, **Suivi colis** (n° de commande + téléphone), **Contact** (formulaire → messages dans l'admin).
- **Admin** (`/admin`) : dashboard, produits (SKU facultatif ; **variantes avec une photo par option** — choisir une couleur change automatiquement la photo principale de la fiche, et la photo choisie suit dans le panier et la commande), catégories, commandes (statuts), clients (clic sur un nom : historique de ses commandes ; **nom en rouge dès 3 commandes annulées**), coupons, messages (suppression à l'unité ou par sélection multiple), **paramètres** (frais de livraison, seuil de gratuité, réduction de bienvenue, alertes de stock, coordonnées, mot de passe admin 14 car. / 2 majuscules / 2 chiffres / 2 spéciaux). Un compte admin ne peut pas passer commande. Une **cloche de notifications** signale les produits dont le stock est sous le seuil (10 par défaut, réglable).
- Le menu est défini dans `src/lib/navigation.ts` ; chaque entrée correspond à une catégorie (`npm run sync:nav` les crée).

## Architecture

```
src/
  app/(shop)/…        pages client            app/admin/…   interface admin (login + (panel) protégé)
  app/api/…           API REST                components/{ui,shop,admin}
  models/             User, Product, Category, Order, Coupon, Settings, Message (+ index)
  services/           logique métier testable : order, coupon, auth, product, pricing, settings, stats
  validation/         schémas Zod (schemas.ts) et règles de mot de passe (password.ts, partagé navigateur/serveur)
  lib/                db, auth, token (Edge), api (erreurs, CSRF), rate-limit, data (cache), phone, tunisia, navigation
  stores/             état client (panier persistant, utilisateur)      middleware.ts   1ʳᵉ barrière /admin, /account
tests/                Vitest : stock concurrent, coupons, anti-abus, téléphone, gouvernorats, SKU, mot de passe
scripts/              create-admin, seed-demo, sync-nav-categories
```

## Sécurité / fiabilité (vérifié)

- **Autorisation côté serveur** : les 28 routes `/api/admin/*` exigent un admin (rôle relu en base) — 401 sans connexion, 403 pour un client ; un client obtient un 404 sur `/admin`.
- Mots de passe bcrypt (coût 12) ; sessions JWT 7 j en cookie `httpOnly` / `SameSite=Lax` / `Secure` (prod), révocables. Contrôle d'origine (anti-CSRF) sur toutes les écritures, limitation de débit (connexion : seuls les échecs comptent), validation Zod partout, en-têtes de sécurité (+ HSTS en prod).
- **Prix, stock, coupons, livraison ne sont jamais crus côté client** : tout est recalculé en base à chaque devis/commande. Stock et coupon : décrément atomique avec compensation (10 commandes simultanées pour 3 unités → exactement 3 réussissent).
- Téléversement d'images : le **contenu réel** du fichier est vérifié (jpg/png/webp/avif), pas le type déclaré ; liens d'images limités à `/uploads/…` et `http(s)://`.

## Média principal de l'accueil

Admin → **Page d'accueil** : l'admin choisit **plusieurs photos** (jusqu'à 8, ordre modifiable) qui **défilent toutes les 2 secondes** (fondu enchaîné, pause au survol), ou une courte vidéo (MP4 H.264 / WebM, 25 Mo max, lue en boucle et muette) avec un aperçu optionnel. Elle est modifiable à tout moment ; sans média, un visuel de marque est affiché (jamais une photo de produit). Les vidéos sont servies par `/media/video/<fichier>` avec requêtes `Range` (lecture sur iPhone, démarrage progressif). Sur connexion lente (3G, économiseur de données) ou avec « réduire les animations », seule la première photo est chargée (pas de défilement) et la vidéo n'est pas téléchargée : l'aperçu s'affiche avec un bouton lecture. Pas de transcodage serveur (ffmpeg non requis) : compresser la vidéo avant l'envoi.

## Performance des images (réseaux lents)

- À l'envoi, chaque image est réduite (2000 px max), convertie en **WebP** et nettoyée de ses métadonnées : une photo de 2,4 Mo devient ~90 Ko.
- Le site ne sert jamais l'original : la route `/media/<fichier>?w=<largeur>` fournit la version adaptée (320 → 1600 px, WebP, mise en cache disque dans `.cache/media`, `Cache-Control: immutable`). Les pages utilisent `srcset`/`sizes` : le navigateur ne télécharge que la taille nécessaire à son écran. Les anciens liens `/uploads/…` sont redirigés vers cette route.
- Mesure (4 miniatures de produits, Fast 3G) : 31 s / 3,2 Mo → 3 s / 0,14 Mo. `sharp` est requis (installé avec `npm install`).

## SEO et performance

**Mesure (Lighthouse mobile, production)** : SEO 100, accessibilité 100, bonnes pratiques 100, performance 97–99 sur l'accueil, la boutique, les fiches produit et les pages d'information (avant : SEO 92, performance 93–99, accessibilité 94–100).

- **Balises** : `title` + `description` uniques par page (dans le `<head>`, y compris pour les robots de partage), canonique, Open Graph / Twitter Card, image de partage par défaut, `lang="fr"`, un seul `h1`, lien d'évitement, fil d'Ariane.
- **Indexation maîtrisée** : seules les listes « genre / catégorie / page » sont indexées. Tri, filtres, prix et recherche → `noindex` + canonique vers la liste propre (et exclus par `robots.txt`). Panier, paiement, compte, connexion, suivi → `noindex`.
- **Données structurées (JSON-LD)** : `Organization` + `WebSite` (recherche interne) sur l'accueil ; `Product` (prix, stock, livraison, retours 7 jours) + `BreadcrumbList` sur les fiches ; `BreadcrumbList` + `ItemList` sur les listes ; `FAQPage` sur la FAQ.
- **Sitemap** (`/sitemap.xml`) : accueil, pages d'information, listes genre / catégorie / catégorie×genre contenant des produits, tous les produits actifs avec leurs images. `robots.txt` généré, `manifest.webmanifest`, icônes (`favicon.ico`, `icon.png`, `apple-icon.png`).
- **Rapidité** : pages publiques en ISR (régénérées toutes les 60 s) avec `Cache-Control` CDN et compatibles « page précédente » (bfcache) ; aucune lecture de cookie côté serveur dans la mise en page ; CSS critique intégré ; JavaScript compilé pour navigateurs récents ; animations d'apparition en CSS pur (plus de bibliothèque d'animation) ; images AVIF/WebP adaptatives (`/media`) ; logos versionnés (`?v=`, cache 1 an) ; image LCP chargée en priorité.
- **Régénérer les icônes / l'image de partage** : `node scripts/generate-icons.mjs`. **Changer un logo** : remplacer le fichier de `public/` et incrémenter `ASSET_VERSION` (`src/lib/assets.ts`).

## Déploiement — checklist

1. Variables d'environnement : `MONGODB_URI`, `JWT_SECRET` (≥ 32 car. aléatoires), **`NEXT_PUBLIC_SITE_URL` = URL publique exacte en https (sans `/` final) — elle alimente canoniques, sitemap, robots et données structurées**, `NEXT_PUBLIC_SITE_NAME`. `SHIPPING_FLAT_FEE` / `FREE_SHIPPING_THRESHOLD` ne sont que des valeurs de départ : l'admin les modifie ensuite dans Paramètres.
2. `npm run build` (idéalement avec la base joignable : l'accueil et les pages d'information sont pré-générées ; sinon elles le sont avec des valeurs par défaut et se régénèrent dès la 1ʳᵉ minute en ligne), puis `npm run seed:admin` et `npm run sync:nav` une fois, et `npm run warm:media` après chaque déploiement pour préparer les images.
3. Servir en **HTTPS** (cookie `Secure`).
4. Derrière un proxy, vérifier que `X-Forwarded-For` est posé par *votre* proxy (il sert à la limitation de débit et au plafond d'inscriptions par IP).
5. Images : `public/uploads` est un stockage local ; sur un hébergeur sans disque persistant, brancher S3/Cloudinary dans `api/admin/upload`.
6. Limiteur de débit en mémoire (par instance) : utiliser Redis en multi-instances.

## Limites connues

Pas de paiement en ligne (paiement à la livraison), pas d'envoi d'emails (les messages de contact arrivent dans l'admin), pas de réinitialisation de mot de passe par email. Sans replica set MongoDB, la commande utilise des compensations plutôt que des transactions.

**Après la mise en ligne** : ajouter le site dans Google Search Console et Bing Webmaster Tools, soumettre `https://votre-domaine/sitemap.xml`, vérifier les résultats enrichis (test des résultats enrichis Google) sur une fiche produit, et rediriger `http://` → `https://` et `www` ↔ nu vers une seule adresse au niveau de l'hébergeur.
