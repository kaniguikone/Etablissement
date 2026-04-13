# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture générale

Application de gestion scolaire en architecture découplée :
- **`back/`** : API REST Laravel 11 (PHP 8.2), authentification via Laravel Sanctum
- **`front/`** : SPA React 18 avec Vite, routing via React Router v6

Le frontend consomme l'API backend via Axios. Les deux projets sont développés et démarrés indépendamment.

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

Les entités principales sont : `Eleve`, `Enseignant`, `Classe`, `Niveau`, `Matiere`, `Parents`, `Scolarite`, `Assiduites`, `Devoir`, `TypeDevoir`, `Periodes`, `Informations`.

Relations clés :
- Un `Eleve` appartient à une `Classe` et a un `Parents`
- Une `Classe` appartient à un `Niveau` et peut avoir plusieurs `Enseignant`
- Un `Enseignant` peut enseigner plusieurs `Matiere` dans plusieurs `Classe` (table pivot `classe_enseignant_matiere`)
- Les `Scolarites`, `Assiduites` et `Devoirs` sont liés aux `Periodes`

## Routes API (`back/routes/api.php`)

Toutes les routes sont sous `/api/`. Les ressources principales suivent le pattern `apiResource` (CRUD standard) :
`/eleves`, `/niveaux`, `/matieres`, `/periodes`, `/scolarites`, `/classes`, `/enseignants`, `/informations`

Des routes personnalisées existent pour les filtres : `/elevesClasse/{id}`, `/classesNiveaux/{id}`, `/classeEnseignants/{id}`, etc.

## Structure du frontend

- `src/components/` : composants organisés par entité (sous-dossiers `eleves/`, `enseignants/`, `classes/`, `niveaux/`, `matieres/`)
- `src/route/RoutesMenu.jsx` : définition centralisée de toutes les routes React Router
- `src/components/Menu.jsx` et `Navbar.jsx` : navigation principale
- Pattern de nommage : `Liste<Entite>.jsx` (liste), `Nouvel<Entite>.jsx` (création), `Details<Entite>.jsx` (détail/édition)
