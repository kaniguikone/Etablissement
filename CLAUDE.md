# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture générale

Application de gestion scolaire en architecture découplée :
- **`back/`** : API REST Laravel 11 (PHP 8.2), multi-tenant (Stancl Tenancy), authentification via Laravel Sanctum
- **`front/`** : SPA React 18 avec Vite, routing via React Router v6
- **`mobile/`** : application Flutter (Android/iOS) — portails enseignant, parent et inscription autonome

Le frontend consomme l'API backend via Axios. Les trois projets sont développés et démarrés indépendamment.

## Commandes

### Backend (dans `back/`)

```bash
# Démarrer le serveur de développement
php artisan serve

# Migrations
php artisan migrate
php artisan migrate:fresh --seed

# Lancer tous les tests
php artisan test
# ou
./vendor/bin/phpunit

# Lancer un test spécifique
php artisan test --filter NomDuTest

# Linter (Laravel Pint)
./vendor/bin/pint

# Tinker (REPL)
php artisan tinker
```

### Frontend (dans `front/`)

```bash
# Démarrer le serveur de développement (port 5173 par défaut)
npm run dev

# Build de production
npm run build

# Linter ESLint
npm run lint

# Prévisualiser le build
npm run preview
```

## Modèles de données

Les entités principales sont : `Eleve`, `SanteEleve`, `Enseignant`, `Classe`, `Niveau`, `Matiere`, `Parents`, `Scolarite`, `Assiduites`, `Devoir`, `TypeDevoir`, `Periodes`, `Informations`, `Paiement`, `FraisAnnexe`, `EmploiDuTemps`, `Sanction`, `Message`, `Notification`, `AnneeScolaire`, `AuditLog`, `HelpArticle`, `ResultatExamen`, `ParentSubscription`, `SchoolParentSlot`.

Entités emploi du temps (chantier EDT, `back/app/Services/Edt/`) : `PlageHoraire` (grille horaire), `SeanceType` (découpage des volumes, rattaché à `NiveauMatiere`), `EnseignantIndisponibilite`, `EdtContrainte` (catalogue des règles MENET), `EdtGeneration` (scénario généré), `GroupePedagogique` (LV2 / dédoublements). Services : `Generateur` (heuristique de génération, isolé et remplaçable), `Validateur` (contrôle vs règles MENET).

Relations clés :
- Un `Eleve` appartient à une `Classe`, peut avoir un `Parents` et une fiche `SanteEleve` (1-1)
- Une `Classe` appartient à un `Niveau` et peut avoir plusieurs `Enseignant` ; `salle_id` = salle attitrée
- Un `Enseignant` peut enseigner plusieurs `Matiere` dans plusieurs `Classe` (table pivot `classe_enseignant_matiere`)
- Les `Scolarites`, `Assiduites` et `Devoirs` sont liés aux `Periodes`
- Un `Parents` peut avoir plusieurs `ParentSubscription` (accès mobile) liées à des `SchoolParentSlot`
- `ResultatExamen` stocke les résultats BEPC/BAC/CEPE par année scolaire
- `EmploiDuTemps` : **global scope `officiel`** (`whereNull('generation_id')`) — les scénarios du générateur sont invisibles par défaut ; utiliser `withoutGlobalScope('officiel')` pour les manipuler. Colonnes `generation_id`, `verrouille`, `groupe_id`, `semaine` (toutes/A/B), `plage_horaire_id`.

## Routes API (`back/routes/tenant.php`)

Toutes les routes tenant sont dans `back/routes/tenant.php`. Les ressources principales suivent le pattern `apiResource` (CRUD standard) :
`/eleves`, `/niveaux`, `/matieres`, `/periodes`, `/scolarites`, `/classes`, `/enseignants`, `/informations`

Routes publiques (sans auth) : `/mobile/login`, `/mobile/parent/inscription`, `/mobile/parent/valider-matricule/{matricule}`, `/mot-de-passe/oublier`, `/mot-de-passe/reinitialiser`.

Routes portail parent (auth parent) : `/parent/enfants`, `/parent/bulletins`, `/parent/assiduites`, `/parent/scolarites`, `/parent/paiements`, `/parent/demandes`, `/parent/slots`.

Routes statistiques : `/stats/generales`, `/stats/generales/export-excel`, `/stats/generales/export-pdf`, `/stats/rapport-ministere`.

Routes emploi du temps : `/plages-horaires`, `/groupes-pedagogiques`, `/seances-types/{niveau_id}`, `/enseignants/{id}/indisponibilites`, `/edt/diagnostic-prerequis`, `/edt/contraintes` (+ `PUT {code}`), `/edt/controle`, `/edt/generations` (CRUD + `/{id}/publier`, `/{id}/regenerer`, `/{id}/creneaux/{cid}`), `/edt/{ref}/pdf/...` (`ref` = `officiel` ou id de scénario).

Des routes personnalisées existent pour les filtres : `/elevesClasse/{id}`, `/classesNiveaux/{id}`, `/classeEnseignants/{id}`, etc.

## Structure du frontend

- `src/components/` : composants organisés par entité (44 sous-dossiers : `eleves/`, `enseignants/`, `classes/`, `niveaux/`, `matieres/`, `parents/`, `stats/`, `fraisannexes/`, `audit/`, `aide/`, etc.)
- `src/route/RoutesMenu.jsx` : définition centralisée de toutes les routes React Router
- `src/components/Menu.jsx` et `Navbar.jsx` : navigation principale
- Pattern de nommage : `Liste<Entite>.jsx` (liste), `Nouvel<Entite>.jsx` (création), `Details<Entite>.jsx` (détail/édition)
- `src/components/parents/InscriptionParent.jsx` : page publique (sans auth) d'inscription parent
- `src/components/parents/DemandesParents.jsx` : validation admin des demandes d'accès parent
- `src/components/stats/StatsGenerales.jsx` : formulaire MENET 14 sections + exports
- Écrans emploi du temps : `edt/GenererEdt.jsx`, `edt/ControleEdt.jsx`, `edt/DiagnosticEdt.jsx`, `edt/GroupesPedagogiques.jsx`, `grille/GrilleHoraire.jsx`, `enseignant/Indisponibilites.jsx`, `volumes/SeancesTypes.jsx` — regroupés dans la sidebar sous le groupe « Emploi du temps » de `Menu.jsx`
- Chantier EDT documenté : `docs/chantier-emploi-du-temps.md` (architecture) et `docs/chantier-edt-lot0.md`
