# Documentation — index

Point d'entrée de la documentation du projet. Voir aussi `CLAUDE.md` à la racine du dépôt pour l'architecture générale et les commandes courantes.

## Produit (`produit/`)

- [`fonctionnalites.md`](produit/fonctionnalites.md) — Vue d'ensemble des fonctionnalités de l'application, mise à jour régulièrement.
- [`roadmap-commerciale.md`](produit/roadmap-commerciale.md) — **Source de vérité** de l'état livré vs restant, avec effort/priorité. À lire en premier avant d'affirmer un statut de fonctionnalité.

## Chantiers (`chantiers/`)

Cadrages et plans d'implémentation des grands chantiers, techniques et historiques.

- `edt/` — Génération automatique des emplois du temps (livré 2026-09-02) :
  - [`chantier-emploi-du-temps.md`](chantiers/edt/chantier-emploi-du-temps.md) — Architecture de référence (pour développeurs).
  - [`chantier-edt-lot0.md`](chantiers/edt/chantier-edt-lot0.md) — Plan d'implémentation détaillé du Lot 0 (paramétrage) + matrice de non-régression.
  - [`emploi-du-temps-guide-complet.md`](chantiers/edt/emploi-du-temps-guide-complet.md) — Guide utilisateur de référence (vocabulaire + parcours + cas concrets), pour directeur des études.
  - [`guide-generation-edt.md`](chantiers/edt/guide-generation-edt.md) — Checklist courte à imprimer, version condensée du guide complet.
  - [`comprendre-generation-edt.md`](chantiers/edt/comprendre-generation-edt.md) — Explique comment le moteur de génération calcule, pour qui veut creuser.
- `budget/` — Gestion du budget d'établissement (Lots 0-4 livrés 2026-09-11/12) :
  - [`chantier-budget.md`](chantiers/budget/chantier-budget.md) — Cadrage, architecture et décisions structurantes.

## Guides (`guides/`)

- [`guide-administrateur.md`](guides/guide-administrateur.md) — Guide utilisateur de la plateforme, pour l'administrateur d'établissement.
- [`guide-deploiement.md`](guides/guide-deploiement.md) — Architecture et procédure de déploiement.
- [`guide-production.md`](guides/guide-production.md) — Mise en production.
- [`commandes-creation.md`](guides/commandes-creation.md) — Commandes de création et de maintenance (artisan).

## Vérifications (`verifications/`)

Documents pratiques à suivre pas à pas pour valider qu'une fonctionnalité livrée fonctionne réellement.

- [`audit-tests-2026-08-14.md`](verifications/audit-tests-2026-08-14.md) — Audit des tests sur les 3 couches (back/front/mobile), avec statut final des correctifs.
- [`guide-demo-et-tests-e2e.md`](verifications/guide-demo-et-tests-e2e.md) — Tests de bout en bout et préparation d'une démonstration client.
- [`verification-rgpd.md`](verifications/verification-rgpd.md) — Vérification de la conformité RGPD livrée.

## Archive (`archive/`)

- [`analyse-experte.md`](archive/analyse-experte.md) — Instantané figé de l'analyse produit du 30/04/2026. Photographie datée, pas un document vivant — voir `produit/roadmap-commerciale.md` pour le statut courant.
