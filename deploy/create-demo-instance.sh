#!/usr/bin/env bash
# ============================================================================
# create-demo-instance.sh — Crée (ou recrée) l'établissement de démonstration
# publique, prépeuplé de données réalistes, accessible aux prospects.
#
# À lancer après install.sh (et après que le DNS + SSL du sous-domaine
# choisi sont en place).
#
# Usage :
#   ./create-demo-instance.sh
#
# Relancer ce script écrase et recrée entièrement l'instance de démo
# existante (données remises à zéro) — pratique pour "rafraîchir" la démo
# avant un rendez-vous commercial important.
# ============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/suivi-scolaire}"
CENTRAL_DOMAIN="${CENTRAL_DOMAIN:-demo.votreapp.ci}"

read -r -p "Identifiant du tenant démo [lycee-demo] : " DEMO_ID
DEMO_ID="${DEMO_ID:-lycee-demo}"

read -r -p "Sous-domaine complet [${DEMO_ID}.${CENTRAL_DOMAIN}] : " DEMO_DOMAIN
DEMO_DOMAIN="${DEMO_DOMAIN:-${DEMO_ID}.${CENTRAL_DOMAIN}}"

read -r -p "Nom affiché de l'établissement [Lycée Démo]: " DEMO_NOM
DEMO_NOM="${DEMO_NOM:-Lycée Démo}"

read -r -p "Template (lycee | lycee_complet | college | primaire) [lycee_complet] : " DEMO_TEMPLATE
DEMO_TEMPLATE="${DEMO_TEMPLATE:-lycee_complet}"

read -r -p "Email admin de démo [admin@${DEMO_ID}.${CENTRAL_DOMAIN}] : " DEMO_ADMIN_EMAIL
DEMO_ADMIN_EMAIL="${DEMO_ADMIN_EMAIL:-admin@${DEMO_ID}.${CENTRAL_DOMAIN}}"

read -r -s -p "Mot de passe admin de démo (à retenir, réutilisé pour chaque RDV) : " DEMO_ADMIN_PASSWORD
echo

cd "${APP_DIR}/back"

echo "→ Création de l'instance de démo « ${DEMO_ID} »"
php artisan demo:creer \
    --id="${DEMO_ID}" \
    --nom="${DEMO_NOM}" \
    --domaine="${DEMO_DOMAIN}" \
    --template="${DEMO_TEMPLATE}" \
    --admin-email="${DEMO_ADMIN_EMAIL}" \
    --admin-password="${DEMO_ADMIN_PASSWORD}"

echo
echo "== Instance de démo créée =="
echo "URL   : https://${DEMO_DOMAIN}"
echo "Admin : ${DEMO_ADMIN_EMAIL}"
echo
echo "Reste à faire :"
echo "  1. Si le domaine n'est pas couvert par le wildcard DNS/SSL existant,"
echo "     ajouter un enregistrement A pour ${DEMO_DOMAIN} et régénérer le certificat."
echo "  2. Mettre à jour le lien de démo sur la landing page publique si besoin"
echo "     (front/src/components/landing/LandingPage.jsx)."
echo "  3. Suivre la checklist docs/guide-demo-et-tests-e2e.md avant tout RDV client"
echo "     (photos élèves, PDF ouvrables sur mobile, emails/CinetPay pas expirés...)."
