# Mode d'emploi — Déploiement de l'instance de démo publique

Ce dossier contient tout ce qu'il faut pour déployer l'application sur un
VPS et publier une instance de démo accessible aux prospects. Objectif :
un directeur peut tester seul, depuis son bureau, à n'importe quelle heure.

## 0. Ce que tu dois préparer AVANT (hors périmètre de ces scripts)

Ces scripts ne peuvent rien faire tant que ces trois points ne sont pas réglés :

1. **Un VPS** (Ubuntu/Debian recommandé) avec PHP 8.2+, MySQL 8.0+, Composer 2+,
   Node.js 18+, Nginx installés.
2. **Un nom de domaine** avec un accès à la zone DNS, pour créer :
   - un enregistrement `A` pour le domaine central (ex. `demo.votreapp.ci` → IP du VPS)
   - un enregistrement wildcard `*.demo.votreapp.ci` → IP du VPS (sinon il
     faudra ajouter un enregistrement `A` à la main pour chaque nouveau tenant)
3. **Un certificat SSL wildcard** (Let's Encrypt via `certbot --manual` +
   challenge DNS, car le wildcard n'est pas supporté par le challenge HTTP standard).

Sans ces trois éléments, rien de ce qui suit n'est exécutable.

## 1. Ordre d'exécution

```
deploy/install.sh                 → une seule fois, sur le VPS vierge
  (config Nginx + SSL manuels — voir section 2 ci-dessous)
deploy/create-demo-instance.sh    → crée l'établissement de démo public
```

Ensuite, à chaque nouveau commit à déployer :

```
deploy/update.sh
```

## 2. Détail des étapes

### a) `install.sh`
- Clone (ou pull) le dépôt, installe les dépendances PHP/JS
- Crée le `.env` si absent et **s'arrête pour te laisser le vérifier/éditer**
  (URL, identifiants MySQL, config mail) — rien de sensible n'est écrit en dur dans le script
- Migre la base centrale, crée le compte super-admin (email/mot de passe
  demandés en interactif, jamais stockés dans le script)
- Build le frontend (`npm run build`)

### b) Config Nginx + SSL (manuel, entre `install.sh` et `create-demo-instance.sh`)
- Adapter `deploy/nginx-demo.conf.template` (remplacer `{{DOMAIN}}`, `{{APP_DIR}}`, `{{PHP_SOCKET}}`)
- L'activer : `ln -s`, `nginx -t`, `systemctl reload nginx`
- Générer le certificat wildcard :
  ```
  certbot certonly --manual -d demo.votreapp.ci -d '*.demo.votreapp.ci' --preferred-challenges dns
  ```

### c) `create-demo-instance.sh`
- Appelle `php artisan demo:creer` avec un domaine public (pas `.localhost`)
- Te demande interactivement : identifiant du tenant, sous-domaine, nom
  affiché, template pédagogique, identifiants admin de démo
- Relançable à tout moment pour **réinitialiser** la démo avant un rendez-vous
  important (les anciennes données du tenant sont supprimées et recréées)

### d) `update.sh`
- À relancer après chaque `git push` sur `main` : pull, dépendances,
  migrations (base centrale **et** tenants, dont la démo), rebuild frontend

## 3. Avant chaque rendez-vous commercial

Une fois l'instance en ligne, suivre la checklist déjà rédigée dans
[`docs/guide-demo-et-tests-e2e.md`](../docs/guide-demo-et-tests-e2e.md)
(section 1 : véracité des données, ouverture des PDF sur le téléphone de
démo, emails/CinetPay pas expirés, etc.).

## 4. Ce que je peux faire ensuite si tu me donnes un accès

Ces scripts sont prévus pour être lancés par toi (ou ton hébergeur/sysadmin)
directement sur le VPS. Si tu me donnes un accès SSH à un serveur déjà loué
avec DNS/SSL déjà en place, je peux exécuter `install.sh` puis
`create-demo-instance.sh` moi-même, étape par étape, en te demandant
confirmation avant chaque action qui touche le serveur (migrations,
écriture de fichiers de config, etc.).
