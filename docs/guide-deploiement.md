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
    'name'     => 'Super Admin',
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
    --plan=basic \
    --email=contact@lycee-moderne.ci \
    --ville=Abidjan
```

Cela crée automatiquement :
- L'entrée dans la table `tenants`
- Le domaine dans la table `domains`
- La base de données `tenant_lycee-moderne`
- Les migrations dans cette base

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
| `php artisan school:create <id> <nom> <domaine>` | Créer un établissement |

---

## 7. Plans tarifaires

| Plan    | Description                                          |
| ------- | ---------------------------------------------------- |
| `demo`  | Accès limité dans le temps (date_expiration requise) |
| `basic` | Fonctionnalités standard                             |
| `pro`   | Toutes les fonctionnalités                           |

Modifier le plan d'un tenant via le super-admin : `https://monapp.ci/superadmin`

---

## 8. Sauvegardes

Sauvegarder **toutes** les bases de données (centrale + tenants) :

```bash
# Base centrale
mysqldump -u root -p suivi_central > backup_central_$(date +%Y%m%d).sql

# Toutes les bases tenants (pattern tenant_*)
mysql -u root -p -e "SHOW DATABASES LIKE 'tenant_%'" | grep tenant_ | \
    xargs -I{} mysqldump -u root -p {} > backup_{}_$(date +%Y%m%d).sql
```
