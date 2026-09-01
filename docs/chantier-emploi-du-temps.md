# Chantier — Génération automatique des emplois du temps

> Document de cadrage — Créé le 2026-08-31
> À valider avant tout développement. Source : note MENET-FP/DPFC/DEEP « Confection de l'emploi du temps » (session août 2022) + état réel du code.
>
> **Décisions déjà prises :**
> - Moteur : **microservice de résolution (Python + Google OR-Tools CP-SAT)** appelé en asynchrone par Laravel.
> - Périmètre cible : **tous les niveaux** (1er cycle 6e→3e et 2nd cycle 2nde→Tle, toutes séries), y compris groupes LV2, dédoublements et quinzaine.
> - Livraison par lots successifs, chacun apportant une valeur autonome.
>
> **Avancement :**
> - **Lot 0 — Paramétrage** : ✅ livré (branche `feat/edt-lot0-parametrage`). Détail : `docs/chantier-edt-lot0.md`.
> - **Lot 1 — Catalogue de contraintes + validateur** : ✅ livré (branche `feat/edt-lot1-contraintes`). Table `edt_contraintes` (13 dures + 5 souples), service `App\Services\Edt\Validateur`, endpoint `GET /edt/controle`, écran `/ControleEdt`. Différé au Lot 4 : contraintes groupes parallèles (D15), quinzaine (D16), tandem PC/SVT contigu sans récré (D8, seul « même jour » fait), souples S3/S4/S6/S8/S10.
> - Lots 2 à 5 : à faire.

---

## 1. Objectif

Permettre à un directeur des études de **générer automatiquement** un emploi du temps complet (toutes les classes) qui respecte :

1. les **contraintes réglementaires** du MENET (règles de la note de confection),
2. les **contraintes matérielles** de l'établissement (salles, labos, gymnase),
3. les **contraintes humaines** (affectations, indisponibilités, charge des enseignants),
4. les **volumes horaires officiels** par niveau et par matière,

puis de le **retoucher à la main**, de **verrouiller** les créneaux satisfaisants et de **relancer une génération partielle** sur le reste, avant **publication** vers les portails enseignant / parent / élève.

---

## 2. État des lieux du code existant

### 2.1 Ce qui est déjà en place

| Brique | Fichier | Remarque |
| --- | --- | --- |
| Table `emploi_du_temps` : `classe_id`, `matiere_id`, `enseignant_id`, `salle_id` (nullable), `jour` (enum lundi→samedi), `heure_debut`, `heure_fin`, `annee_scolaire_id` | `back/database/migrations/tenant/2026_04_02_000001_create_emploi_du_temps_table.php` | Granularité = 1 créneau. Pas de `semaine`, pas de `groupe`, pas de `verrouille`. |
| CRUD + **détection de chevauchements** classe / enseignant / salle | `back/app/Http/Controllers/API/EmploiDuTempsController.php` (`detecterChevauchements`, L36) | Base solide pour le futur validateur de contraintes dures. |
| Vue grille « semaine type » par classe, sélection/suppression d'un créneau | `front/src/components/emploidutemps/ListeEmploiDuTemps.jsx` | Lecture seule + suppression. Pas de drag & drop. |
| Saisie guidée d'un créneau (niveau → classe → matière → enseignant, filtrée par `classe_enseignant_matiere`) | `front/src/components/emploidutemps/NouvelEmploiDuTemps.jsx` | Affiche déjà les « heures restantes à placer » par matière. |
| `volumes_horaires` : `niveau_id` × `matiere_id` → `heures_semaine` (décimal), `semaines_annee` | `back/database/migrations/tenant/2026_04_07_203023_create_volumes_horaires_table.php` | Stocke un **total hebdo**, pas le **découpage en séances**. |
| Analytique volume horaire : conformité EDT vs prévu, charge des enseignants, heures restantes par classe | `back/app/Http/Controllers/API/VolumeHoraireController.php` | Réutilisable pour scorer un EDT et alimenter le solveur. |
| `salles` : `nom`, `capacite`, `type` (classe / labo / salle_info / gymnase / autre), `batiment`, `actif` | `back/database/migrations/tenant/2026_04_09_000001_create_salles_table.php` | Pas de lien « salle attitrée » ↔ classe. |
| `classes` : possède déjà `salle_classe` (string libre) et `effectif_max_classe` | `back/app/Models/Classe.php` | À migrer vers un FK `salle_id` + `effectif` réel. |
| Pivot `classe_enseignant_matiere` (qui enseigne quoi, où) | `back/database/migrations/tenant/2022_06_11_100307_classe_enseignant_matiere.php` | Pas de timestamps, pas de notion de groupe / volume par affectation. |
| Algorithme **glouton** de placement (prototype) | `back/database/seeders/EmploiDuTempsSeeder.php` (L61) | Place les cours en évitant les collisions enseignant. Aucune règle MENET. Utile comme *fallback* et comme base de tests. |
| Gestion des remplacements d'enseignants | `back/app/Http/Controllers/API/RemplacementController.php` | Consomme l'EDT ; à garder cohérent. |
| Portails mobile : « mon emploi du temps » enseignant + « emploi du temps » enfant | `mobile/lib/screens/enseignant/enseignant_emploi_screen.dart`, `mobile/lib/screens/child/emploi_du_temps_screen.dart` | Consommateurs finaux ; format de sortie à préserver. |

### 2.2 Ce qui manque

- **Grille horaire de l'établissement** paramétrable (plages de cours, récréations, pause méridienne). Aujourd'hui codée en dur dans le seeder (`08:00-10:00`, `10:00-12:00`, `14:00-16:00`, `16:00-18:00`).
- **Découpage du volume horaire en séances** (`2+1+1`, `1+1+1`, `2h consécutives`, `1h30`, `quinzaine`).
- **Indisponibilités des enseignants** (vacataires, temps partiel, jour non travaillé).
- **Salle attitrée** par classe + contrôle capacité ≥ effectif.
- **Groupes pédagogiques** (LV2 Allemand/Espagnol, dédoublements de langues/sciences).
- **Semaine A / Semaine B** (quinzaine).
- **Catalogue de contraintes** dures et souples, activables et pondérables par établissement.
- **Le moteur de génération** lui-même.
- **Historisation des scénarios** générés + comparaison + verrouillage.

---

## 3. Le problème, formellement

La confection d'un emploi du temps est un **problème de satisfaction de contraintes sous optimisation** (*school timetabling*), NP-difficile. On ne le résout pas par une boucle déterministe : il faut un **solveur** qui explore l'espace des affectations, garantit les **contraintes dures** (jamais violées) et **minimise** la somme pondérée des violations de **contraintes souples** (préférences).

La note MENET est, de fait, le **cahier des charges des contraintes**. La section 5 ci-dessous la traduit.

### Variables de décision

Pour chaque **séance à placer** (une occurrence de cours : classe ou groupe, matière, enseignant, durée) :

- un **créneau de départ** (jour + plage horaire de la grille),
- une **salle**,
- éventuellement une **semaine** (A, B, ou toutes) pour la quinzaine.

L'enseignant est généralement **déjà déterminé** par `classe_enseignant_matiere` ; le solveur ne le choisit que s'il y a plusieurs profs possibles pour la même (classe, matière).

---

## 4. Modèle de données cible

### 4.1 Nouvelles tables

#### `plages_horaires` — la grille de l'établissement
Une migration = une table (cf. `feedback_migrations`).

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | pk | |
| `libelle` | string | ex. « M1 », « Récréation matin », « Pause méridienne » |
| `jour` | enum lundi→samedi *(ou `null` = tous les jours ouvrés)* | Permet des grilles différentes le mercredi/samedi |
| `ordre` | smallint | Position dans la journée |
| `heure_debut` / `heure_fin` | time | |
| `type` | enum `cours` / `recreation` / `pause_midi` | Le solveur ne place des cours que sur `cours` ; `recreation` sert à la règle « tandem non séparé par la récré » |
| `actif` | bool | |

> La granularité de la grille doit permettre des séances de **1h**, **2h** et **1h30** (1er cycle PC/SVT). Option retenue : plages de base de 1h, et une séance « longue » occupe *n* plages contiguës du même jour sans récréation intercalée. Les 1h30 sont modélisées comme une plage dédiée dans la grille.

#### `enseignant_indisponibilites`

| Colonne | Type | Rôle |
| --- | --- | --- |
| `enseignant_id` | fk | |
| `jour` | enum | |
| `plage_horaire_id` | fk nullable | Soit une plage précise… |
| `heure_debut` / `heure_fin` | time nullable | …soit un intervalle libre |
| `motif` | string nullable | « Autre établissement », « temps partiel », « décharge » |
| `type` | enum `dure` / `preference` | Indispo stricte vs « éviter si possible » |
| `annee_scolaire_id` | fk | |

#### `seances_types` — découpage du volume horaire (le cœur MENET)

Remplace/complète l'unique `heures_semaine` de `volumes_horaires`.

| Colonne | Type | Rôle |
| --- | --- | --- |
| `niveau_id` | fk | |
| `serie_id` | fk nullable | Le découpage diffère selon la série (ex. Maths 1èreA-A1 = `1+1+1+1`, A2 = `1+1+1`) |
| `matiere_id` | fk | |
| `duree_seance` | decimal(3,1) | 1.0, 2.0, 1.5 |
| `nb_seances` | smallint | Nombre d'occurrences de cette durée par semaine |
| `consecutif_autorise` | bool | Les 2h consécutives sont-elles permises pour ce (niveau, matière) ? |
| `frequence` | enum `hebdomadaire` / `quinzaine` | QZ |
| `salle_type_requis` | enum nullable | `labo`, `salle_info`, `gymnase` → force une salle spécialisée |
| `tandem_groupe` | string nullable | Identifiant de tandem (`PC-SVT`, `LV2`) pour lier deux séances |

Exemple pour la 3e (d'après la note MENET, tableau P4) :

| Matière | Découpage note | `seances_types` |
| --- | --- | --- |
| Français | `2+1+1+1+1` | 1×(2.0) + 4×(1.0), `consecutif_autorise=true` pour la séance de 2h |
| Maths | `2+1+1` | 1×(2.0) + 2×(1.0), consécutif autorisé |
| Anglais | `1+1+1` | 3×(1.0) |
| Hist-Géo | `1+1+1+1` | 4×(1.0), **`consecutif_autorise=false`** |
| PC | `0+(2h)` | 1×(2.0) quinzaine, `salle_type_requis=labo`, `tandem_groupe=PC-SVT` |
| SVT | `0+(2h)` | 1×(2.0) quinzaine, `salle_type_requis=labo`, `tandem_groupe=PC-SVT` |
| EPS | `2` | 1×(2.0), `salle_type_requis=gymnase` |
| EDHC / AP-EM | `1` | 1×(1.0) |

#### `groupes_pedagogiques` — LV2, dédoublements

| Colonne | Type | Rôle |
| --- | --- | --- |
| `classe_id` | fk | |
| `matiere_id` | fk | |
| `libelle` | string | « LV2 Allemand », « Groupe A - Espagnol » |
| `enseignant_id` | fk | |
| `effectif` | smallint nullable | |
| `parallele_groupe` | string nullable | Les groupes de même `parallele_groupe` sont enseignés **simultanément** (la classe entière se scinde) |

#### `edt_generations` — historisation des scénarios

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | pk | |
| `libelle` | string | « Scénario 1 - priorité profs », « v2 mercredi libéré » |
| `annee_scolaire_id` | fk | |
| `parametres` | json | Jours ouvrés, poids des contraintes souples, classes incluses, créneaux verrouillés pris en compte |
| `statut` | enum `en_attente` / `en_cours` / `termine` / `echec` / `publie` | |
| `score` | integer nullable | Somme pondérée des pénalités souples (plus bas = mieux) |
| `diagnostic` | json nullable | Contraintes non satisfiables, séances non placées, explications |
| `duree_resolution_s` | integer nullable | |
| `created_by` / `created_at` | | |

#### `edt_creneaux` (ou extension de `emploi_du_temps`)

Deux options :

- **Option A (recommandée)** : ajouter à `emploi_du_temps` les colonnes `generation_id` (fk nullable — `null` = EDT « officiel » courant), `groupe_id` (fk nullable), `semaine` (enum `A` / `B` / `toutes`, défaut `toutes`), `verrouille` (bool, défaut false), `plage_horaire_id` (fk nullable).
- Option B : table séparée `edt_creneaux` pour les brouillons, promue vers `emploi_du_temps` à la publication. Plus lourd, dédouble la logique de conflit.

> Retenir l'**option A** : un scénario est un ensemble de lignes `emploi_du_temps` avec le même `generation_id` ; publier = basculer `generation_id` à `null` (et archiver l'ancien officiel).

#### `edt_contraintes` — catalogue configurable

| Colonne | Type | Rôle |
| --- | --- | --- |
| `code` | string | `EPS_HEURES_CHAUDES`, `HG_PAS_CONSECUTIF`, `EQUILIBRE_SEMAINE`, `PAS_5H_EFFORT`, `TANDEM_MEME_JOUR`, `TROUS_PROF`, `MATIN_DIFFICILE`… |
| `nature` | enum `dure` / `souple` | |
| `active` | bool | |
| `poids` | integer | Pénalité si violée (souples uniquement) |
| `parametres` | json | ex. `{ "debut": "10:00", "fin": "16:00" }` pour l'EPS |

### 4.2 Modifications de tables existantes

| Table | Changement |
| --- | --- |
| `classes` | `salle_id` fk nullable (salle attitrée), `effectif` (dérivable de `count(eleves)` mais figé pour le calcul), migration douce depuis `salle_classe` |
| `matieres` | `effort_soutenu` bool (règle des 5h en 6e/5e), `couleur` (code couleur MENET : Français=jaune, PC=vert, Maths=rouge, HG=bleu, Philo/EPS=orange, Anglais=rose, LV2=violet, SVT=marron, EDHC=gris, AP/EM/TM=blanc) |
| `classe_enseignant_matiere` | `volume_horaire` decimal nullable (heures dues par ce prof pour cette classe/matière), `groupe_id` fk nullable, `id` déjà présent → ajouter timestamps |
| `volumes_horaires` | conserver comme total de contrôle ; la vérité opérationnelle passe dans `seances_types` |

---

## 5. Traduction des règles MENET en contraintes

### 5.1 Contraintes DURES (le solveur ne produit jamais de solution qui les viole)

| # | Règle (source note MENET) | Traduction |
| --- | --- | --- |
| D1 | Un enseignant ne peut pas être à deux endroits à la fois | Pas deux séances du même `enseignant_id` sur des plages qui se chevauchent (même semaine) |
| D2 | Une classe / un groupe ne suit qu'un cours à la fois | Idem par `classe_id` (+ `groupe_id`) |
| D3 | Une salle accueille une seule classe à la fois | Idem par `salle_id` |
| D4 | « La priorité est à l'ET des élèves qui ne doivent en aucun cas se déplacer pour une heure de cours » | Chaque classe a une **salle attitrée** ; toutes ses séances y ont lieu **sauf** celles avec `salle_type_requis` (labo PC/SVT, gymnase EPS, salle info) |
| D5 | « PC et SVT se font obligatoirement en salles spécialisées » | `salle_type_requis=labo` ⇒ salle de `type=labo` obligatoire |
| D6 | « Ne pas mettre à la même heure, en salles spécialisées, plusieurs classes de même niveau » (matériel) | Sur une plage donnée, au plus 1 classe d'un même `niveau_id` par `salle_type` spécialisé |
| D7 | « Ne jamais mettre les cours d'EPS pendant les heures chaudes (jamais après 10h et jamais avant 16h) » | EPS uniquement sur plages `heure_fin ≤ 10:00` **ou** `heure_debut ≥ 16:00` |
| D8 | « Le tandem PC/SVT, au 1er cycle, ne doit jamais être séparé par la récréation » | Les deux séances du tandem sont sur des plages **contiguës** (ordre *n* et *n+1*) sans plage `type=recreation` entre elles |
| D9 | « Mettre toujours les tandems PC/SVT dans la même journée » | Même `jour` pour les deux séances du `tandem_groupe` |
| D10 | « Ne jamais placer 2 heures consécutives en classe entière dans la même discipline, sauf [liste] » | Deux séances de 1h de la même matière/classe interdites sur plages contiguës, **sauf** si `seances_types.consecutif_autorise=true` pour ce (niveau, série, matière) |
| D11 | « Histoire-Géographie : ne jamais placer 2 heures consécutives » | Cas explicite de D10, `consecutif_autorise=false` forcé pour HG |
| D12 | Volume horaire officiel respecté | Le nombre et la durée des séances placées = exactement `seances_types` (par niveau/série/matière) |
| D13 | Indisponibilités strictes des enseignants | Pas de séance d'un prof sur une de ses `enseignant_indisponibilites` de `type=dure` |
| D14 | Capacité salle | `salle.capacite ≥ classe.effectif` (ou effectif du groupe) |
| D15 | Groupes parallèles (LV2, dédoublements) | Les séances de groupes partageant `parallele_groupe` sont sur **la même plage**, **salles différentes**, **profs différents** ; la classe entière n'a alors aucun autre cours |
| D16 | Quinzaine | Une séance `frequence=quinzaine` est placée en semaine `A` **ou** `B` ; la plage libérée l'autre semaine peut accueillir l'autre matière du tandem (PC en A / SVT en B, par ex.) |

### 5.2 Contraintes SOUPLES (minimisées, pondérées, configurables via `edt_contraintes`)

| # | Règle | Pénalité si violée |
| --- | --- | --- |
| S1 | « Répartition équilibrée des disciplines sur toute la semaine » | Écart-type du nombre d'heures/jour d'une matière ; concentration sur peu de jours pénalisée |
| S2 | « Surtout en 6e/5e, éviter 5 heures successives de cours à effort soutenu » | +poids par bloc de ≥ 4 plages consécutives de matières `effort_soutenu=true` |
| S3 | « Monter les 2h consécutives de Français / Maths / Philo à des moments favorables » | Séance longue placée l'après-midi ou en fin de journée pénalisée |
| S4 | Tandems PC/SVT 2nd cycle : « fin de matinée + début d'après-midi », « le matin de préférence pour 2nd, 1èreA, 1èreC, TD » ; « l'après-midi pour 1èreD » | Écart au créneau préconisé |
| S5 | Trous (heures creuses) dans la journée d'un enseignant | +poids par trou |
| S6 | Cours difficiles le matin | Matière `effort_soutenu` l'après-midi légèrement pénalisée |
| S7 | Indisponibilités `type=preference` des enseignants | +poids |
| S8 | Regrouper les jours de présence d'un vacataire | Journées isolées pénalisées |
| S9 | Équilibre de la charge quotidienne des classes (volume horaire ≈ constant par jour) | Écart à la moyenne |
| S10 | Éviter de finir tard / commencer tôt sans nécessité | Plages extrêmes pénalisées |

### 5.3 Procédure de montage recommandée (note MENET, section E) — utilisée comme **ordre de priorité du solveur**

1. EPS pour toutes les classes (contrainte de créneau la plus rigide).
2. Tandems PC/SVT en commençant par le 2nd cycle.
3. Séances doubles de Français, puis Maths (3e + 2nd cycle), puis Philo.
4. LV2 dans toutes les classes concernées.
5. Heures restantes du 2nd cycle (Maths, Français, Anglais, HG, Philo).
6. 6e/5e en classe entière (Français, Maths, HG, EDHC, AP, EM).
7. 4e/3e de la même façon.

> En CP-SAT cet ordre se traduit par un **phasage de la résolution** (on fixe d'abord EPS et les tandems, puis on résout le reste avec ces variables gelées) ou par des **poids de priorité** décroissants. Le phasage est plus rapide et plus prévisible.

---

## 6. Architecture du moteur

```
┌─────────────┐   1. POST /edt/generations        ┌────────────────────┐
│   Front     │ ────────────────────────────────► │   Laravel (API)    │
│  (React)    │   2. GET  /edt/generations/{id}   │                    │
└─────────────┘ ◄──────────────────────────────── │  - construit le    │
                     (polling statut + score)     │    modèle JSON     │
                                                  │  - pousse un Job   │
                                                  └─────────┬──────────┘
                                                            │ 3. queue (Redis / database)
                                                            ▼
                                                  ┌────────────────────┐
                                                  │  Job GenererEDT    │
                                                  │  - appelle le      │
                                                  │    microservice    │
                                                  │    (HTTP interne)  │
                                                  └─────────┬──────────┘
                                                            │ 4. POST /solve  (JSON problème)
                                                            ▼
                                                  ┌────────────────────┐
                                                  │  Microservice      │
                                                  │  Python + OR-Tools │
                                                  │  CP-SAT            │
                                                  │  - modélise        │
                                                  │  - résout (timeout)│
                                                  │  - renvoie JSON    │
                                                  └────────────────────┘
                                                            │ 5. solution + diagnostic
                                                            ▼
                                            Laravel persiste les lignes emploi_du_temps
                                            (generation_id = {id}), met à jour edt_generations
```

### 6.1 Le microservice

- **Stack** : Python 3.12, FastAPI, `ortools` (CP-SAT). Conteneur Docker léger.
- **Sans état** : reçoit tout le problème dans la requête, ne touche pas la base. Réutilisable pour tous les tenants.
- **Endpoint** `POST /solve` :
  - entrée : plages, séances à placer, salles, affectations, indisponibilités, créneaux verrouillés, contraintes actives + poids, `time_limit_s`.
  - sortie : `{ statut, score, creneaux: [...], non_places: [...], explications: [...] }`.
- **Robustesse** : timeout configurable (ex. 60–180 s), renvoie la **meilleure solution partielle** trouvée même si l'optimum n'est pas prouvé.
- **Déploiement** : même VPS que l'API, port interne non exposé publiquement, appelé via `http://127.0.0.1:8090`. Ajout à `docker-compose` / systemd + au `docs/guide-deploiement.md`.

### 6.2 Fallback PHP

Le glouton actuel (`EmploiDuTempsSeeder`) est promu en service `App\Services\Edt\GloutonGenerator` :

- respecte D1–D7, D12–D14 (les plus simples),
- sert pour les **très petites structures** (école primaire mono-classe/niveau),
- sert de **pré-remplissage** instantané avant lancement du vrai solveur,
- garantit qu'une panne du microservice ne bloque pas totalement la fonctionnalité.

### 6.3 Le validateur (partagé)

`App\Services\Edt\Validateur` : prend un ensemble de créneaux + le catalogue de contraintes, renvoie la liste des violations (dures et souples) avec le score. Utilisé :

- pour **noter** un scénario généré,
- pour **valider une retouche manuelle** en drag & drop (extension de `detecterChevauchements`),
- dans les **tests**.

---

## 7. API (nouvelles routes tenant)

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/plages-horaires` / `POST` / `PUT` / `DELETE` | Grille de l'établissement |
| `GET` | `/enseignants/{id}/indisponibilites` / `POST` / `DELETE` | Indispos profs |
| `GET` | `/seances-types/{niveau_id}` / `POST` / `PUT` / `DELETE` | Découpage des volumes |
| `GET` | `/groupes-pedagogiques` / `POST` / `PUT` / `DELETE` | LV2, dédoublements |
| `GET` | `/edt/contraintes` / `PUT /edt/contraintes/{code}` | Activation + poids |
| `POST` | `/edt/generations` | Lance une génération (params dans le corps) |
| `GET` | `/edt/generations` | Liste des scénarios + scores |
| `GET` | `/edt/generations/{id}` | Détail : statut, score, diagnostic, créneaux |
| `POST` | `/edt/generations/{id}/publier` | Promeut le scénario en EDT officiel |
| `POST` | `/edt/generations/{id}/dupliquer` | Repart d'un scénario pour ajustements |
| `PATCH` | `/edt/generations/{id}/creneaux/{cid}` | Déplace / verrouille un créneau (avec validation) |
| `POST` | `/edt/generations/{id}/regenerer` | Relance en gelant les créneaux `verrouille=true` |
| `GET` | `/edt/generations/{id}/export/{type}` | PDF par classe / enseignant / salle (code couleur MENET) |
| `GET` | `/edt/diagnostic-prerequis` | Vérifie que le paramétrage est complet avant génération |

---

## 8. Découpage en lots

Chaque lot est **livrable et utile indépendamment**.

### Lot 0 — Paramétrage (fondations)
**Contenu :** migrations `plages_horaires`, `enseignant_indisponibilites`, `seances_types`, `classes.salle_id` + `effectif`, `matieres.effort_soutenu` + `couleur`. Écrans d'administration correspondants. Endpoint `diagnostic-prerequis`. Seeders de démo + pré-remplissage des `seances_types` depuis les tableaux MENET (P4) pour les templates lycée/collège existants.
**Valeur autonome :** la saisie manuelle de l'EDT devient beaucoup plus guidée et fiable (grille imposée, salle attitrée, capacité vérifiée).
**Tests :** unitaires migrations + feature endpoints paramétrage.

### Lot 1 — Catalogue de contraintes + validateur
**Contenu :** table `edt_contraintes` + seeder des 16 dures / 10 souples. Service `Validateur`. Extension de `detecterChevauchements` → toutes les contraintes dures. Écran « Contrôle de l'EDT » qui note l'EDT courant et liste les violations (reprend l'esprit de `VolumeHoraireController::conformite`).
**Valeur autonome :** un directeur qui monte son EDT à la main sait immédiatement ce qui cloche vis-à-vis des règles MENET.
**Tests :** un cas de test par règle (D1–D16, S1–S10).

### Lot 2 — Microservice + génération v1
**Contenu :** microservice Python/OR-Tools (`/solve`), déploiement (Docker/systemd + doc). Job Laravel `GenererEDT`, table `edt_generations`, colonnes `generation_id` / `verrouille` / `plage_horaire_id` sur `emploi_du_temps`. Écran « Générer » (choix jours, poids, classes) + suivi de progression + affichage du scénario et du score.
**Périmètre v1 :** classe entière, séances 1h et 2h, contraintes D1–D14 + S1–S3, S5. **Pas encore** : groupes, quinzaine, 1h30.
**Valeur autonome :** génération complète exploitable pour un collège standard et un lycée sans options.
**Tests :** jeu de données de référence (1 collège complet), assertions sur 0 violation dure + score sous un seuil ; test d'intégration Laravel ↔ microservice (mock + réel en CI si conteneur dispo).

### Lot 3 — Édition assistée + exports
**Contenu :** grille drag & drop dans le front (déplacer un créneau → `PATCH` avec validation live), verrouillage visuel, régénération partielle, comparaison côte à côte de deux scénarios, publication. Exports PDF classe / enseignant / salle avec le **code couleur MENET**. Notification aux enseignants/parents à la publication.
**Valeur autonome :** cycle complet « générer → ajuster → publier → diffuser ».
**Tests :** feature `PATCH` créneau (accepte/refuse), publication (bascule `generation_id`), génération des 3 PDF.

### Lot 4 — Cas avancés
**Contenu :** `groupes_pedagogiques` + contrainte D15 (parallélisme LV2 / dédoublements). Semaine A/B + D16 (quinzaine), affichage grille « quinzaine ». Séances 1h30. Contraintes S4, S6–S10. Phasage du solveur selon la procédure MENET (section 5.3).
**Valeur autonome :** couvre l'intégralité des séries de lycée (A1/A2, C, D) et le 1er cycle PC/SVT en quinzaine.
**Tests :** cas LV2 (2 groupes parallèles), cas quinzaine (PC semaine A / SVT semaine B, tandem même jour), cas 1h30.

### Lot 5 — Multi-sites & finitions
**Contenu :** grilles horaires distinctes par bâtiment/site, contrainte de non-déplacement inter-sites pour un prof entre deux plages contiguës, réglages fins de performance (warm-start depuis l'EDT de l'an dernier via l'archivage), intégration à la doc in-app (`HelpArticleSeeder`).
**Valeur autonome :** groupes scolaires multi-campus.

---

## 9. UX cible (parcours directeur des études)

1. **Paramétrer** (une fois par an) : grille horaire, salles + salle attitrée par classe, indisponibilités des profs, vérifier le découpage des séances.
2. **Diagnostic** : l'écran affiche « paramétrage complet / 3 classes sans salle attitrée / 2 profs sans indispo renseignée ».
3. **Générer** : choisir les jours ouvrés, ajuster éventuellement les priorités (curseurs sur les contraintes souples), lancer. Barre de progression (le job tourne 1–3 min).
4. **Examiner** : grille par classe + par prof + par salle, score global, liste des compromis (« 4 trous chez M. X », « Français placé l'après-midi en 2ndeB »).
5. **Ajuster** : glisser un créneau, l'outil valide en direct ; **verrouiller** les parties satisfaisantes.
6. **Régénérer** le reste sans casser le verrouillé.
7. **Comparer** deux scénarios, en **publier** un.
8. **Diffuser** : les portails enseignant / parent / élève se mettent à jour, notification automatique.

---

## 10. Risques et points de vigilance

| Risque                                                                                       | Mitigation                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problème **insatisfaisable** (contraintes trop serrées : pas assez de labos, prof surchargé) | Le solveur renvoie un **diagnostic** des contraintes bloquantes et des séances non placées ; l'écran explique « il manque 1 créneau de labo le mardi ». Relâchement guidé. |
| Temps de résolution long sur gros lycée (30+ classes)                                        | Timeout + meilleure solution partielle ; phasage MENET ; warm-start depuis l'EDT précédent ; résolution par niveau si besoin.                                              |
| Nouvelle brique à déployer (Python)                                                          | Conteneur unique, sans état, sans base ; fallback PHP ; documenté dans le guide de déploiement ; santé surveillée (Sentry / `/up`).                                        |
| Cohérence avec les **remplacements** et l'**archivage** existants                            | Le remplacement lit toujours l'EDT officiel (`generation_id = null`) ; l'archivage fin d'année archive l'EDT officiel et permet le warm-start.                             |
| Multi-tenant : isoler les calculs                                                            | Le microservice est sans état ; chaque requête `/solve` ne contient que les données d'un tenant. Aucune persistance côté Python.                                           |
| Régression sur la saisie manuelle actuelle                                                   | Lots 0–1 purement additifs ; l'écran actuel reste fonctionnel ; `emploi_du_temps` conserve son schéma, on ajoute des colonnes nullable.                                    |
| Données de paramétrage lourdes à saisir                                                      | Pré-remplissage `seances_types` depuis les tableaux MENET pour les templates ; import Excel (réutiliser l'infra d'import existante) ; recopie d'année en année.            |

---

## 11. Prérequis de paramétrage avant toute génération (checklist)

- [ ] Grille horaire complète (plages de cours + récréations + pause méridienne) pour chaque jour ouvré.
- [ ] Toutes les classes ont une salle attitrée et un effectif.
- [ ] Salles spécialisées déclarées (labos, salle info, gymnase) avec capacité.
- [ ] `classe_enseignant_matiere` complet (chaque matière de chaque classe a un prof).
- [ ] `seances_types` renseigné pour chaque (niveau, série) — pré-rempli depuis MENET, à ajuster.
- [ ] Indisponibilités des vacataires / temps partiels saisies.
- [ ] Groupes LV2 / dédoublements créés (Lot 4).
- [ ] Contraintes souples revues (poids par défaut acceptables).

---

## 12. Prochaine étape

Valider ce cadrage, puis ouvrir le **Lot 0** avec un plan d'implémentation détaillé (migrations exactes, écrans, endpoints, seeders MENET, tests).
