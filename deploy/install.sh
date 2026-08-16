#!/usr/bin/env bash
# ============================================================================
# install.sh — Premier déploiement du serveur (à lancer UNE SEULE FOIS)
#
# Usage :
#   1. Copier ce script sur le VPS (scp ou git clone directement dessus)
#   2. Adapter les variables de configuration ci-dessous
#   3. chmod +x install.sh && ./install.sh
#
# Prérequis côté serveur (à installer AVANT de lancer ce script) :
#   - PHP 8.2+ avec extensions pdo_mysql, mbstring, xml, zip, gd, bcmath
#   - MySQL 8.0+ déjà installé, avec un utilisateur MySQL créé pour l'app
#   - Composer 2+
#   - Node.js 18+
#   - Nginx (le vhost est fourni séparément dans deploy/nginx-demo.conf.template)
#   - Le DNS du domaine central et le wildcard (*.demo.votreapp.ci) doivent
#     déjà pointer vers l'IP de ce serveur — sinon SSL/HTTPS échouera plus tard
# ============================================================================

set -euo pipefail

# ── Configuration — À ADAPTER avant de lancer ──────────────────────────────
REPO_URL="${REPO_URL:-<url_du_repo_git>}"
APP_DIR="${APP_DIR:-/var/www/suivi-scolaire}"
CENTRAL_DOMAIN="${CENTRAL_DOMAIN:-demo.votreapp.ci}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_NAME="${DB_NAME:-suivi_central}"
DB_USER="${DB_USER:-suivi_app}"
# DB_PASSWORD n'est jamais mis en dur ici — demandé de façon interactive juste en dessous.

echo "== Installation initiale — Suivi Scolaire =="
echo "Domaine central : ${CENTRAL_DOMAIN}"
echo "Répertoire      : ${APP_DIR}"
echo

read -r -s -p "Mot de passe MySQL pour l'utilisateur '${DB_USER}' : " DB_PASSWORD
echo
read -r -p "Email du compte super-admin à créer : " SUPERADMIN_EMAIL
read -r -s -p "Mot de passe du compte super-admin : " SUPERADMIN_PASSWORD
echo

# ── 1. Récupération du code ─────────────────────────────────────────────────
if [ -d "${APP_DIR}/.git" ]; then
    echo "→ Dépôt déjà présent, on passe au pull (voir update.sh pour les mises à jour futures)."
    git -C "${APP_DIR}" pull origin main
else
    echo "→ Clonage du dépôt dans ${APP_DIR}"
    git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}/back"

# ── 2. Dépendances backend ──────────────────────────────────────────────────
echo "→ Installation des dépendances PHP"
composer install --no-dev --optimize-autoloader

# ── 3. Fichier .env ──────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "→ Création du .env à partir de .env.example"
    cp .env.example .env
    php artisan key:generate --force
fi

echo
echo "⚠️  Vérifie maintenant manuellement dans back/.env :"
echo "    APP_URL=https://${CENTRAL_DOMAIN}"
echo "    APP_ENV=production"
echo "    APP_DEBUG=false"
echo "    DB_HOST=${DB_HOST}"
echo "    DB_DATABASE=${DB_NAME}"
echo "    DB_USERNAME=${DB_USER}"
echo "    DB_PASSWORD=${DB_PASSWORD}"
echo "    TENANCY_CENTRAL_DOMAINS=${CENTRAL_DOMAIN}"
echo "    MAIL_* (si les emails de démo doivent partir réellement)"
echo
read -r -p "Appuie sur Entrée une fois le .env vérifié/édité pour continuer..."

# ── 4. Base centrale ─────────────────────────────────────────────────────────
echo "→ Migration de la base centrale"
php artisan migrate --force

# ── 5. Compte super-admin ────────────────────────────────────────────────────
echo "→ Création du compte super-admin (${SUPERADMIN_EMAIL})"
php artisan tinker --execute="
\App\Models\SuperAdmin::updateOrCreate(
    ['email' => '${SUPERADMIN_EMAIL}'],
    ['nom' => 'Super Admin', 'password' => bcrypt('${SUPERADMIN_PASSWORD}')]
);
echo 'Super-admin OK';
"

# ── 6. Frontend ───────────────────────────────────────────────────────────────
echo "→ Build du frontend"
cd "${APP_DIR}/front"
npm install
npm run build

# ── 7. Config Laravel en cache (perf production) ─────────────────────────────
cd "${APP_DIR}/back"
php artisan config:cache
php artisan route:cache

echo
echo "== Installation applicative terminée =="
echo "Reste à faire manuellement (hors périmètre de ce script) :"
echo "  1. Config Nginx : adapter deploy/nginx-demo.conf.template et l'activer"
echo "  2. Certificat SSL wildcard : certbot certonly --manual -d ${CENTRAL_DOMAIN} -d '*.${CENTRAL_DOMAIN}' --preferred-challenges dns"
echo "  3. Recharger Nginx : sudo nginx -t && sudo systemctl reload nginx"
echo "  4. Lancer deploy/create-demo-instance.sh pour créer l'établissement de démo public"
