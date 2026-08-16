# Guide de mise en production

> Application de gestion scolaire multi-tenant  
> Stack : Laravel 11 · React 18 · MySQL · Nginx · Ubuntu 22.04

---

## Prérequis serveur

**Serveur recommandé :** VPS Linux Ubuntu 22.04 LTS  
**Domaine principal :** `tondomaine.ci`  
**Sous-domaines :**
- `app.tondomaine.ci` → domaine central (admin groupe)
- `*.tondomaine.ci` → tous les tenants (écoles)

---

## Étape 1 — Préparation du serveur

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances
sudo apt install -y nginx mysql-server php8.2-fpm php8.2-cli \
  php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl \
  php8.2-zip php8.2-gd php8.2-bcmath php8.2-intl \
  curl git unzip supervisor certbot python3-certbot-nginx

# Installation Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Installation Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Étape 2 — DNS

Chez ton registrar (ex : Afnic, OVH, Gandi), ajoute ces entrées DNS :

| Type | Nom               | Valeur          |
|------|-------------------|-----------------|
| A    | `tondomaine.ci`   | `IP_DU_SERVEUR` |
| A    | `app`             | `IP_DU_SERVEUR` |
| A    | `*`               | `IP_DU_SERVEUR` |

> Le wildcard `*` est essentiel — il permet à chaque nouveau tenant d'être automatiquement accessible sans toucher au DNS.

> Attendre la propagation DNS (5 min à 24h selon le registrar).

---

## Étape 3 — Base de données MySQL

```bash
sudo mysql_secure_installation

sudo mysql -u root -p
```

```sql
-- Base centrale
CREATE DATABASE etablissement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utilisateur dédié
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON etablissement.* TO 'appuser'@'localhost';

-- Droits pour créer les bases tenant dynamiquement (préfixe "tenant")
GRANT ALL PRIVILEGES ON `tenant%`.* TO 'appuser'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

---

## Étape 4 — Déploiement du code

```bash
# Créer le dossier de l'application
sudo mkdir -p /var/www/etablissement
sudo chown $USER:$USER /var/www/etablissement

# Cloner le projet
cd /var/www/etablissement
git clone https://github.com/ton-compte/ton-repo.git .

# ── Backend ──────────────────────────────────────────────────────
cd /var/www/etablissement/back

composer install --no-dev --optimize-autoloader

cp .env.example .env
nano .env                   # voir Étape 5

php artisan key:generate

# ── Frontend ──────────────────────────────────────────────────────
cd /var/www/etablissement/front
npm install
npm run build
# Résultat dans front/dist/ — servi directement par Nginx
```

---

## Étape 5 — Configuration `.env` production (backend)

```env
APP_NAME="Suivi Scolaire"
APP_ENV=production
APP_KEY=base64:...                  # généré par key:generate
APP_DEBUG=false
APP_URL=https://app.tondomaine.ci

APP_TIMEZONE=Africa/Abidjan

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=etablissement
DB_USERNAME=appuser
DB_PASSWORD=MOT_DE_PASSE_FORT

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_DOMAIN=.tondomaine.ci       # point devant = valide pour tous les sous-domaines

QUEUE_CONNECTION=database           # ou redis si installé

FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_HOST=smtp.tondomaine.ci
MAIL_PORT=587
MAIL_USERNAME=noreply@tondomaine.ci
MAIL_PASSWORD=MOT_DE_PASSE_MAIL
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@tondomaine.ci
MAIL_FROM_NAME="Suivi Scolaire"

CINETPAY_API_KEY=ta_cle_prod
CINETPAY_SITE_ID=ton_site_id_prod
CINETPAY_BASE_URL=https://api-checkout.cinetpay.com/v2

# SENTRY_LARAVEL_DSN=...   # optionnel — Sentry n'est pas encore installé dans le projet (composer require sentry/sentry-laravel requis au préalable)
```

---

## Étape 6 — Mise à jour `config/tenancy.php`

```php
'central_domains' => [
    'app.tondomaine.ci',   // domaine central production
],
```

---

## Étape 7 — Migrations et optimisations

```bash
cd /var/www/etablissement/back

# Migrations base centrale
# Crée notamment : tenants, domains, super_admins, groups, group_admins,
# abonnements_saas, factures_saas, demandes_acces, tarifs_licence, config_saas,
# central_users, central_parent_links, central_enseignant_links
php artisan migrate --force

# Optimisations production
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Permissions storage
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

---

## Étape 8 — Configuration Nginx

**Fichier : `/etc/nginx/sites-available/etablissement`**

```nginx
# ── Domaine central (admin groupe) ──────────────────────────────
server {
    listen 80;
    server_name app.tondomaine.ci;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.tondomaine.ci;

    ssl_certificate     /etc/letsencrypt/live/app.tondomaine.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.tondomaine.ci/privkey.pem;

    root /var/www/etablissement/front/dist;
    index index.html;

    # SPA — toutes les routes vers index.html sauf /api
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API → PHP-FPM Laravel
    location /api {
        root /var/www/etablissement/back/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /var/www/etablissement/back/public$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    location ~ \.php$ {
        root /var/www/etablissement/back/public;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME /var/www/etablissement/back/public$fastcgi_script_name;
        include fastcgi_params;
    }
}

# ── Sous-domaines tenants (écoles) — wildcard ───────────────────
server {
    listen 80;
    server_name ~^(?<tenant>[^.]+)\.tondomaine\.ci$;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ~^(?<tenant>[^.]+)\.tondomaine\.ci$;

    ssl_certificate     /etc/letsencrypt/live/tondomaine.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tondomaine.ci/privkey.pem;

    # Frontend React (même build pour tous les tenants)
    root /var/www/etablissement/front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        root /var/www/etablissement/back/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME /var/www/etablissement/back/public$fastcgi_script_name;
            include fastcgi_params;
        }
    }

    location ~ \.php$ {
        root /var/www/etablissement/back/public;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME /var/www/etablissement/back/public$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/etablissement /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Étape 9 — SSL (certificats HTTPS)

```bash
# Certificat pour le domaine central
sudo certbot --nginx -d app.tondomaine.ci

# Certificat wildcard pour tous les tenants
sudo certbot certonly --manual --preferred-challenges dns \
  -d tondomaine.ci -d "*.tondomaine.ci"
# → Certbot demande d'ajouter un enregistrement DNS TXT chez ton registrar
# → Attendre la propagation puis valider
```

> Le certificat wildcard couvre automatiquement tous les sous-domaines tenants présents et futurs.

---

## Étape 10 — Queue et tâches planifiées

```bash
# Créer la table des jobs
cd /var/www/etablissement/back
php artisan queue:table
php artisan migrate --force
```

**Supervisor — `/etc/supervisor/conf.d/etablissement-queue.conf` :**

```ini
[program:etablissement-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/etablissement/back/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/etablissement-queue.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start etablissement-queue:*
```

**Cron — tâches planifiées Laravel :**

```bash
sudo crontab -e -u www-data
```

```cron
* * * * * cd /var/www/etablissement/back && php artisan schedule:run >> /dev/null 2>&1
```

---

## Étape 11 — Créer le premier groupe et tenant

```bash
cd /var/www/etablissement/back

# Créer un groupe scolaire
php artisan group:create "Groupe Excellence CI" \
  --email=contact@groupe-excellence.ci \
  --admin-email=admin@groupe-excellence.ci \
  --admin-password=MotDePasseFort123 \
  --admin-nom="Administrateur Groupe"

# Créer un tenant indépendant (--type est obligatoire ; applique déjà
# automatiquement le modèle pédagogique correspondant)
php artisan school:create lycee-moderne "Lycée Moderne Abidjan" lycee-moderne.tondomaine.ci \
  --type=lycee_complet \
  --admin-email=admin@lycee.ci \
  --admin-password=motdepasse

# Créer un tenant rattaché à un groupe (remplacer 1 par l'ID du groupe)
php artisan school:create lycee-excellence "Lycée Excellence Cocody" lycee-excellence.tondomaine.ci \
  --type=lycee_complet \
  --group-id=1 \
  --admin-email=admin@lycee-excellence.ci \
  --admin-password=motdepasse

# Pour réappliquer/changer un template a posteriori sur un tenant existant :
php artisan template:apply lycee-moderne lycee_complet 2025-2026
```

---

## Étape 12 — Vérifications finales

```bash
# Test API centrale
curl https://app.tondomaine.ci/api/group/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@groupe-excellence.ci","password":"MotDePasseFort123"}'

# Test API tenant
curl https://lycee-moderne.tondomaine.ci/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lycee.ci","password":"motdepasse"}'

# Vérifier les logs
tail -f /var/www/etablissement/back/storage/logs/laravel.log

# Vérifier la queue
sudo supervisorctl status

# Vérifier Nginx
sudo nginx -t && sudo systemctl status nginx
```

---

## Procédure de mise à jour (déploiement continu)

```bash
cd /var/www/etablissement

# Récupérer les dernières modifications
git pull origin main

# Backend
cd back
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
sudo chown -R www-data:www-data storage bootstrap/cache

# Frontend
cd ../front
npm install
npm run build

# Redémarrer les workers
sudo supervisorctl restart etablissement-queue:*
```

---

## Récapitulatif des URLs

| Qui | URL | Usage |
|-----|-----|-------|
| Admin groupe | `https://app.tondomaine.ci` | Dashboard groupe, gestion écoles |
| École indépendante | `https://lycee-moderne.tondomaine.ci` | Interface école autonome |
| École dans groupe | `https://lycee-excellence.tondomaine.ci` | Interface école membre |
| API centrale | `https://app.tondomaine.ci/api` | Routes `/group/*` |
| API tenant | `https://lycee-moderne.tondomaine.ci/api` | Routes école |

---

## Différences développement / production

| Aspect | Développement | Production |
|--------|--------------|------------|
| Serveur web | WAMP / `php artisan serve` | Nginx + PHP-FPM |
| HTTPS | Non | Oui (Let's Encrypt) |
| Sous-domaines | `hosts` + VirtualHosts manuels | DNS wildcard automatique |
| Frontend | Vite dev server (port 5173) | Build statique servi par Nginx |
| Queue | `sync` (immédiat) | `database` + Supervisor |
| Cache | Fichier | Fichier (ou Redis) |
| Logs | Debug complet | Erreurs uniquement |
| Nouveaux tenants | VirtualHost à ajouter manuellement | Automatique via DNS wildcard |
