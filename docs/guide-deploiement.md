# Guide de déploiement — Suivi Scolaire SaaS

## Architecture

```
Serveur central
├── Base de données centrale  →  tenants, domains, super_admins
├── Base de données tenant    →  tenant_lycee-moderne (tables app)
├── Base de données tenant    →  tenant_college-kennedy (tables app)
└── ...

Sous-domaines
├── lycee-moderne.monapp.ci   →  Lycée Moderne (tenant)
├── college-kennedy.monapp.ci →  Collège Kennedy (tenant)
└── monapp.ci                 →  Page centrale / super-admin
```

---

## 1. Prérequis serveur

- PHP 8.2+ avec extensions : `pdo_mysql`, `mbstring`, `xml`, `zip`, `gd`, `bcmath`
- MySQL 8.0+
- Composer 2+
- Node.js 18+ (pour le build frontend)
- Apache ou Nginx avec support des virtual hosts / wildcards
- Certificat SSL wildcard `*.monapp.ci` (Let's Encrypt ou autre)

---

## 2. Premier déploiement (serveur vierge)

### 2.1 Cloner le projet

```bash
git clone <repo> /var/www/suivi-scolaire
cd /var/www/suivi-scolaire/back
```

### 2.2 Installer les dépendances PHP

```bash
composer install --no-dev --optimize-autoloader
```

### 2.3 Configurer l'environnement

```bash
cp .env.example .env
php artisan key:generate
```

Éditer `.env` :

```env
APP_NAME="Suivi Scolaire"
APP_URL=https://monapp.ci

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=suivi_central      # Base centrale
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe

# Domaine central (sans sous-domaine)
TENANCY_CENTRAL_DOMAINS=monapp.ci
```

### 2.4 Migrer la base centrale

```bash
php artisan migrate
```

Crée les tables : `tenants`, `domains`, `super_admins`

### 2.5 Créer le compte super-admin

```bash
php artisan tinker
```

```php
\App\Models\SuperAdmin::create([
    'nom'      => 'Super Admin',
    'email'    => 'admin@monapp.ci',
    'password' => bcrypt('motdepasse_securise'),
]);
```

### 2.6 Builder le frontend

```bash
cd /var/www/suivi-scolaire/front
npm install
npm run build
```

Le build est généré dans `front/dist/`.

### 2.7 Configurer le web server

**Nginx — virtual host wildcard :**

```nginx
# Domaine central
server {
    listen 443 ssl;
    server_name monapp.ci;
    root /var/www/suivi-scolaire/back/public;

    ssl_certificate     /etc/letsencrypt/live/monapp.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monapp.ci/privkey.pem;

    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}

# Sous-domaines tenants (wildcard)
server {
    listen 443 ssl;
    server_name *.monapp.ci;
    root /var/www/suivi-scolaire/back/public;

    ssl_certificate     /etc/letsencrypt/live/monapp.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monapp.ci/privkey.pem;

    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
}
```

### 2.8 Mettre à jour `config/tenancy.php`

```php
'central_domains' => [
    'monapp.ci',
],
```

---

## 3. Ajouter un nouvel établissement

### 3.1 Créer le tenant

```bash
cd /var/www/suivi-scolaire/back
php artisan school:create lycee-moderne "Lycée Moderne d'Abidjan" lycee-moderne.monapp.ci \
    --type=lycee \
    --email=contact@lycee-moderne.ci \
    --ville=Abidjan \
    --admin-email=admin@lycee-moderne.ci \
    --admin-password=motdepasse_securise
```

`--type` est **obligatoire** (valeurs possibles : `lycee`, `lycee_complet`, `college`, `primaire` — détermine le modèle de pré-remplissage pédagogique appliqué automatiquement). `--admin-email`/`--admin-password` créent directement le premier compte administrateur ; sans eux, il faudra le créer manuellement ensuite. Options additionnelles : `--group-id=` (rattacher à un groupe scolaire existant), `--annee=` (ex: `2025-2026`, défaut : année en cours), `--periodes=` (`trimestre` par défaut ou `semestre`).

Cela crée automatiquement :
- L'entrée dans la table `tenants`
- Le domaine dans la table `domains`
- La base de données `tenant_lycee-moderne`, migrée
- La fiche établissement (type, ville, contact) et le pré-remplissage pédagogique du type choisi (niveaux, matières, séries...)

### 3.2 Seeder les données initiales

```bash
php artisan tenants:seed --tenants=lycee-moderne
```

Crée : rôles, compte admin, matières, niveaux, types de devoirs, chapitres.

### 3.3 Compiler l'APK mobile (optionnel)

```bash
cd /var/www/suivi-scolaire/mobile
flutter build apk --dart-define=API_HOST=lycee-moderne.monapp.ci
cp build/app/outputs/flutter-apk/app-release.apk storage/app/apk/lycee-moderne.apk
```

### 3.4 DNS

Ajouter un enregistrement DNS :

```
lycee-moderne.monapp.ci  →  A  →  IP_DU_SERVEUR
```

> Si votre hébergeur supporte le wildcard DNS `*.monapp.ci`, cette étape est inutile pour chaque nouveau tenant.

### 3.5 Accès

| Qui | URL | Identifiants |
|-----|-----|--------------|
| Direction / Admin | `https://lycee-moderne.monapp.ci` | `admin@etablissement.ci` / `admin123` *(à changer)* |
| Super Admin | `https://monapp.ci/superadmin` | Compte créé à l'étape 2.5 |
| Parents / Mobile | APK compilé avec `API_HOST=lycee-moderne.monapp.ci` | — |

---

## 4. Mises à jour de l'application

### 4.1 Mise à jour du code

```bash
cd /var/www/suivi-scolaire
git pull origin main
cd back
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
```

### 4.2 Migrer toutes les bases tenants

```bash
php artisan tenants:migrate
```

### 4.3 Rebuilder le frontend si nécessaire

```bash
cd ../front
npm install
npm run build
```

---

## 5. Workflow local (développement)

### Lancer le backend

```bash
cd back
php artisan serve
# Laravel tourne sur http://localhost:8000
```

### Tester un tenant en local

1. Ajouter dans `C:\Windows\System32\drivers\etc\hosts` :
   ```
   127.0.0.1   lycee-test.localhost
   ```

2. Accéder à `http://lycee-test.localhost:8000`

### Lancer le frontend

```bash
cd front
# .env ou .env.local :
# VITE_API_URL=http://lycee-test.localhost:8000/api
npm run dev
# Frontend sur http://localhost:5173
```

---

## 6. Commandes utiles

| Commande | Description |
|----------|-------------|
| `php artisan tenants:list` | Lister tous les tenants |
| `php artisan tenants:migrate --tenants=<id>` | Migrer un tenant spécifique |
| `php artisan tenants:migrate-fresh --tenants=<id>` | Réinitialiser la base d'un tenant |
| `php artisan tenants:seed --tenants=<id>` | Seeder un tenant |
| `php artisan tenants:seed --tenants=<id> --class=AdminSeeder` | Seeder spécifique |
| `php artisan school:create <id> <nom> <domaine> --type=<type>` | Créer un établissement (`--type` obligatoire) |

---

## 7. Facturation

Il n'y a plus de plans tarifaires fixes (`demo`/`basic`/`pro`/`premium`). Chaque établissement est facturé sur un **montant négocié au cas par cas**, avec un tarif licence/élève affiché à titre indicatif seulement (non branché automatiquement sur la facturation réelle).

Le super-admin gère cela via `https://monapp.ci/superadmin` :
- **Tarifs & Licences** : configuration des tranches tarifaires indicatives et simulateur de coût (`TarifsLicenceController`).
- **Abonnements** : suivi de l'abonnement et de la facturation par établissement (tables `abonnements_saas`, `factures_saas`).
- **Demandes d'accès** : traitement des demandes entrantes (formulaire public `/inscription-etablissement`) avant provisionnement d'un nouvel établissement via `school:create`.

---

## 8. Monitoring et erreurs

Le code est en place (`sentry/sentry-laravel` côté backend, `@sentry/react` côté frontend, route `/up` de Laravel pour la supervision de disponibilité). **Reste à faire manuellement** : créer les comptes/projets externes et renseigner les DSN — aucune valeur n'est codée en dur dans le dépôt.

### 8.1 Erreurs applicatives (Sentry)

1. Créer un projet **Laravel** et un projet **React** sur [sentry.io](https://sentry.io) (ou une instance auto-hébergée) — un compte gratuit suffit pour démarrer.
2. Récupérer le DSN du projet Laravel et le renseigner dans `back/.env` (voir `back/.env.example`) :

```env
SENTRY_LARAVEL_DSN=https://xxxx@oXXX.ingest.sentry.io/YYYY
```

3. Récupérer le DSN du projet React et créer `front/.env.production` à partir de `front/.env.production.example` :

```env
VITE_SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/YYYY
```

Ce fichier est ignoré par git (comme `front/.env`) — à créer sur chaque environnement de build (poste de déploiement ou CI), pas à committer.

4. Rebuild du frontend (`npm run build`) pour que le DSN soit intégré au bundle.

Tant que `SENTRY_LARAVEL_DSN` / `VITE_SENTRY_DSN` sont vides, le SDK reste inactif (aucun appel réseau) — l'intégration est donc sans risque à déployer avant même d'avoir créé les comptes Sentry. En attendant leur configuration, la seule visibilité sur les erreurs backend reste `back/storage/logs/laravel.log`.

### 8.2 Disponibilité (UptimeRobot ou équivalent)

Laravel expose nativement une route de santé sur `/up` (définie dans `back/bootstrap/app.php`) : elle répond `200 OK` si l'application a démarré correctement, sans dépendance à la base de données.

1. Créer un compte sur [UptimeRobot](https://uptimerobot.com) (plan gratuit suffisant pour un moniteur).
2. Ajouter un moniteur HTTP(S) pointant vers `https://<domaine-central>/up`, intervalle 5 min.
3. Configurer une alerte email (et/ou SMS/Slack selon le plan) en cas de statut différent de 200.

Cette étape ne peut pas être automatisée depuis le dépôt : elle nécessite un compte UptimeRobot et l'accès au domaine en production (DNS déjà pointé, cf. `deploy/install.sh`).

---

## 9. RGPD / protection des données

Politique de confidentialité publique (`/politique-confidentialite`), durée de rétention configurable, droit à l'effacement (suppression d'établissement renforcée + anonymisation ciblée élève/parent) et chiffrement au repos des champs sensibles — écran de gestion : `/superadmin/rgpd`.

**Après tout déploiement introduisant de nouvelles migrations tenant (ex. : cette fonctionnalité)**, ne pas oublier :

```bash
php artisan migrate            # migrations centrales
php artisan tenants:migrate    # migrations tenant, sur CHAQUE tenant existant
```

Pour cette fonctionnalité spécifiquement, exécuter une fois en plus (idempotent, peut être relancé sans risque) :

```bash
php artisan rgpd:chiffrer-donnees-existantes
```

Cette commande chiffre les téléphones `User`/`Etablissement`/`DemandeAcces` déjà en base (le cast Eloquent `encrypted` ne chiffre que ce qui est écrit *après* son activation — les données existantes doivent être migrées explicitement, sans quoi leur lecture échouerait). À exécuter après `tenants:migrate` (élargissement des colonnes) et avant de considérer la fonctionnalité opérationnelle en production.

**Limites connues (périmètre volontairement restreint, voir `docs/roadmap-commerciale.md` §3.4) :** `numero_parent` et `telephone_enseignant` restent en clair (identifiants de connexion) ; l'anonymisation d'un parent ne déprovisionne pas son profil `CentralUser` cross-établissements.

---

## 9. Sauvegardes

Sauvegarder **toutes** les bases de données (centrale + tenants) :

```bash
# Base centrale
mysqldump -u root -p suivi_central > backup_central_$(date +%Y%m%d).sql

# Toutes les bases tenants (pattern tenant_*)
mysql -u root -p -e "SHOW DATABASES LIKE 'tenant_%'" | grep tenant_ | \
    xargs -I{} mysqldump -u root -p {} > backup_{}_$(date +%Y%m%d).sql
```
