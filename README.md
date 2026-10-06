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

- **Boutique** : accueil, catalogue (filtres, tri, recherche, pagination), fiche produit (galerie, zoom, variantes), panier sans compte, checkout 3 étapes avec choix du **gouvernorat** (24) et **téléphone tunisien** contrôlé, confirmation, promotions.
- **Compte client** : tableau de bord, commandes, coupons, profil, mot de passe. Code de bienvenue (`WELCOME-XXXXXX`, −10 % par défaut, réglable ou désactivable par l'admin ; usage unique, lié au compte).
- **Service client** : FAQ, Livraison, Retours & Échanges, **Suivi colis** (n° de commande + téléphone), **Contact** (formulaire → messages dans l'admin).
- **Admin** (`/admin`) : dashboard, produits (SKU facultatif), catégories, commandes (statuts), clients, coupons, messages, **paramètres** (frais de livraison, seuil de gratuité, réduction de bienvenue, coordonnées, mot de passe admin 14 car. / 2 majuscules / 2 chiffres / 2 spéciaux). Un compte admin ne peut pas passer commande.
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

## Déploiement — checklist

1. Variables d'environnement : `MONGODB_URI`, `JWT_SECRET` (≥ 32 car. aléatoires), `NEXT_PUBLIC_SITE_URL` (https), `NEXT_PUBLIC_SITE_NAME`. `SHIPPING_FLAT_FEE` / `FREE_SHIPPING_THRESHOLD` ne sont que des valeurs de départ : l'admin les modifie ensuite dans Paramètres.
2. `npm run build`, puis `npm run seed:admin` et `npm run sync:nav` une fois.
3. Servir en **HTTPS** (cookie `Secure`).
4. Derrière un proxy, vérifier que `X-Forwarded-For` est posé par *votre* proxy (il sert à la limitation de débit et au plafond d'inscriptions par IP).
5. Images : `public/uploads` est un stockage local ; sur un hébergeur sans disque persistant, brancher S3/Cloudinary dans `api/admin/upload`.
6. Limiteur de débit en mémoire (par instance) : utiliser Redis en multi-instances.

## Limites connues

Pas de paiement en ligne (paiement à la livraison), pas d'envoi d'emails (les messages de contact arrivent dans l'admin), pas de réinitialisation de mot de passe par email. Sans replica set MongoDB, la commande utilise des compensations plutôt que des transactions.
