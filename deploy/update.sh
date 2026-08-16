#!/usr/bin/env bash
# ============================================================================
# update.sh — Mise à jour du serveur après un nouveau commit (à relancer à
# chaque déploiement, une fois l'installation initiale faite via install.sh)
#
# Usage :
#   ./update.sh
# ============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/suivi-scolaire}"

echo "== Mise à jour — Suivi Scolaire =="

cd "${APP_DIR}"
echo "→ git pull"
git pull origin main

cd "${APP_DIR}/back"
echo "→ Dépendances PHP"
composer install --no-dev --optimize-autoloader

echo "→ Migrations base centrale"
php artisan migrate --force

echo "→ Migrations de tous les tenants (dont l'instance de démo)"
php artisan tenants:migrate

echo "→ Cache config/routes"
php artisan config:cache
php artisan route:cache

echo "→ Build frontend"
cd "${APP_DIR}/front"
npm install
npm run build

echo
echo "== Mise à jour terminée =="
echo "Pense à recharger PHP-FPM si le code a changé en profondeur :"
echo "  sudo systemctl reload php8.2-fpm"
