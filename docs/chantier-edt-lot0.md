# Lot 0 — Paramétrage (fondations de la génération d'EDT)

> Plan d'implémentation détaillé — Créé le 2026-08-31
> Préalable : `docs/chantier-emploi-du-temps.md` (cadrage validé).
> Ce lot est **purement additif** : aucune régression sur la saisie manuelle actuelle, aucune colonne existante supprimée ou renommée.

---

## 0. État d'avancement (2026-08-31)

Branche `feat/edt-lot0-parametrage`. **Non committé** (commit global prévu à la fin).

| Sous-lot | Backend + tests | Frontend | Statut |
| --- | --- | --- | --- |
| 0.1 Familles + couleur MENET | ✅ (`/matieres/familles`, `MatiereFamilleSeeder`) | ✅ `ChampsEdtMatiere` sur les formulaires matière | ✅ (assistant en masse `/ConfigMatieres` → couvert par `db:seed --class=MatiereFamilleSeeder`) |
| 0.2 Grille horaire | ✅ `PlageHoraireController` | ✅ `/GrilleHoraire` | ✅ |
| 0.3 Salle attitrée | ✅ `classes.salle_id` + commande `edt:reconcilier-salles` | ✅ select dans les 2 formulaires classe | ✅ |
| 0.4 Séances-types | ✅ endpoints + `generer` + `SeanceTypeSeeder` | ✅ `SeancesTypes` sous `/VolumeHoraire` | ✅ |
| 0.5 Indisponibilités | ✅ `EnseignantIndisponibiliteController` | ✅ `/Indisponibilites` | ✅ (onglet fiche enseignant : différé, l'écran d'ensemble couvre le besoin) |
| 0.6 Diagnostic + templates | ✅ `/edt/diagnostic-prerequis`, seeders dans `TemplateService` | ✅ `/DiagnosticEdt` | ✅ (JSON templates : la grille/séances passe par les seeders idempotents) |
| §6-7 Câblage `NouvelEmploiDuTemps` | ✅ `plage_horaire_id` optionnel dans le contrôleur (heures dérivées, mobile intact) | ✅ sélecteur de créneau + salle attitrée pré-remplie | ✅ |

**Tests : 141 back passent** (121 avant + 20 nouveaux : `MatiereEdtTest` ×6, `EdtParametrageTest` ×13, `EmploiDuTempsTest` +1). `pint` clean sur tous les fichiers créés ; les fichiers existants modifiés gardent leur style d'origine (déjà non conforme pint avant ce chantier — diffs volontairement minimaux). `npm run lint` : **−4 erreurs / +5 warnings** vs baseline (`exhaustive-deps` sur `toast`, motif présent partout).

Migrations : `2026_09_01_000001..000004` (3 tables neuves + 1 ALTER groupé, colonnes toutes nullable). `emploi_du_temps` n'a gagné que `plage_horaire_id`.

Articles d'aide in-app ajoutés (`HelpArticleSeeder`) : grille horaire, diagnostic EDT, indisponibilités + mise à jour de l'article emploi du temps. Mapping route→module dans `AideContextuelle.jsx`.

**Différé (hors périmètre strict Lot 0, faible valeur) :** onglet indispos sur `DetailsEnseignant`, assistant familles intégré dans l'écran `/ConfigMatieres`, enrichissement explicite des 4 JSON de templates.

---

## 1. Objectif du lot

Mettre en place toutes les **données de paramétrage** dont le moteur (Lot 2) aura besoin, et qui **améliorent déjà la saisie manuelle** :

1. **Familles de matières** + code couleur MENET (support des règles pédagogiques malgré la granularité fine des matières).
2. **Grille horaire** de l'établissement (plages de cours, récréations, pause méridienne) — éditable.
3. **Salle attitrée** par classe + **type de salle requis** par matière + contrôle de capacité.
4. **Découpage du volume horaire en séances** (`2h` + `1h` + `1h`, quinzaine, tandem).
5. **Indisponibilités des enseignants**.
6. **Diagnostic de complétude** du paramétrage + enrichissement des 4 templates.

**Valeur livrée dès ce lot :** la création d'un créneau se fait en choisissant une **plage de la grille** (fin des saisies d'heures incohérentes), la salle est **pré-remplie** par la salle attitrée, et un écran de **diagnostic** dit ce qu'il reste à paramétrer.

---

## 2. Ce qui existe déjà et qu'on réutilise

| Élément existant | Usage dans le Lot 0 |
| --- | --- |
| `niveau_matieres` (`niveau_id`, `serie_id`, `matiere_id`, `obligatoire`, `coefficient`, `groupe_alternatif_id`) | **Clé de rattachement des séances-types.** C'est déjà la table « programme par niveau/série ». |
| `volumes_horaires` (`niveau_id` × `matiere_id` → `heures_semaine`) | Reste le **total de contrôle** ; l'écran affiche « séances = X h / volume = Y h » et signale l'écart. |
| `classe_matieres` + `groupes_alternatifs` (LV2/LV3) | Résolution des matières alternatives déjà en place — exploitée au Lot 4 pour les groupes parallèles. Rien à faire ici. |
| `classes.salle_classe` (string libre) + `classes.effectif_max_classe` | On ajoute `salle_id` (FK) ; `salle_classe` devient legacy (conservé, migration douce). `effectif_max_classe` sert au contrôle de capacité. |
| `salles` (`type` : classe / labo / salle_info / gymnase / autre, `capacite`) | Cible du `salle_id` de classe et du `salle_type_requis` de matière. |
| `ConfigurationMatieresController` + écran `/ConfigMatieres` | Endroit naturel pour l'assistant d'affectation en masse des **familles** et **couleurs**. |
| Écran `/VolumeHoraire` (`front/src/components/volumes/VolumeHoraire.jsx`) | Étendu : chaque ligne matière devient dépliable pour éditer son **découpage en séances**. |
| `TemplateService` + `back/database/templates/*.json` | Étendus : grille par défaut, familles, `salle_type_requis`, découpage des séances. |
| `ModuleSeeder` + `Menu.jsx` + `RoutesMenu.jsx` (pattern `moduleSlug` / `PrivateRoute permissions/modules`) | Ajout des nouveaux écrans au catalogue de modules et à la sidebar. |
| `EmploiDuTempsTest` (`RefreshDatabase`, `CreatesTestData`, `connecterAdmin()`) | Modèle des tests feature à écrire. |

---

## 3. Points de conception à valider AVANT de coder

| # | Décision proposée | Pourquoi |
| --- | --- | --- |
| **C1** | Introduire `matieres.famille` (enum court : `francais`, `maths`, `hist_geo`, `anglais`, `lv2`, `philo`, `pc`, `svt`, `eps`, `edhc`, `arts_em`, `tic`, `autre`). | Le référentiel réel éclate « Français » en *Composition Française / Orthographe / Oral Français* et utilise *Sciences Physiques et Chimie (SPC)*. Les règles MENET (« 2h consécutives de Français », « tandem PC/SVT », « HG jamais 2h ») et le **code couleur** se raisonnent au niveau **famille**, pas matière. |
| **C2** | Les **séances-types** se rattachent à `niveau_matieres.id` (donc niveau + série), pas à la classe. Un override par classe est repoussé (Lot 4 si besoin réel). | Colle au modèle MENET (tableaux P4 par niveau/série) et à la table programme déjà en place. |
| **C3** | Ajouter `plage_horaire_id` (nullable, FK) à `emploi_du_temps` **dès ce lot**. La saisie manuelle passe par un **choix de plage** ; `heure_debut` / `heure_fin` restent renseignés (copiés depuis la plage) pour ne rien casser côté mobile, analytique et remplacements. | Fiabilise la saisie tout de suite et prépare le Lot 2 sans migration supplémentaire. |
| **C4** | Les **ALTER** (colonnes ajoutées à `classes`, `matieres`, `emploi_du_temps`) sont regroupés dans **une seule migration** `..._etendre_tables_pour_edt.php`. Les **nouvelles tables** gardent chacune leur migration. | Respecte l'esprit « une table = une migration » (qui vise la création fragmentée) tout en évitant 6 micro-migrations `add_x_to_y`. Cohérent avec les précédents `2026_07_13_000001_add_missing_foreign_keys...` et `2026_08_16_140000_elargir_colonnes_pour_chiffrement`. |
| **C5** | Grille horaire = **portée établissement unique** en Lot 0. Les grilles différentes le mercredi/samedi sont gérées par la colonne `jour` (nullable = tous les jours ouvrés). Le multi-bâtiments est repoussé au Lot 5. | Périmètre maîtrisé ; couvre 95 % des établissements. |
| **C6** | `salle_type_requis` porté par `matieres` (pas par séance). EPS→`gymnase`, PC/SPC→`labo`, SVT→`labo`, TIC→`salle_info`. | Une matière a toujours le même besoin de salle. Plus simple. |

---

## 4. Sous-lots

Ordre de réalisation = ordre de dépendance. Chaque sous-lot est mergeable seul.

### 0.1 — Familles de matières + code couleur

**Migration** — incluse dans `..._etendre_tables_pour_edt.php` :
```
ALTER matieres:
  + famille           string(20) nullable        // C1
  + couleur           string(20) nullable         // code hex ou nom bootstrap
  + salle_type_requis enum('labo','salle_info','gymnase') nullable   // C6
  + effort_soutenu    boolean default false        // règle des 5h en 6e/5e
```

**Modèle** `Matiere` : ajouter aux `$fillable`. Constante `Matiere::FAMILLES` (liste + libellé + couleur MENET par défaut).

Table de correspondance famille → couleur MENET (note P3) :

| Famille | Couleur | Famille | Couleur |
| --- | --- | --- | --- |
| `francais` | jaune | `philo` | orange |
| `pc` | vert | `eps` | orange |
| `maths` | rouge | `anglais` | rose |
| `hist_geo` | bleu | `lv2` | violet |
| `svt` | marron | `edhc` | gris |
| `arts_em` (AP/EM/TM) | blanc | `tic` / `autre` | — |

**Backend** : `MatiereController::store/update` acceptent les 4 champs. Nouveau `MatiereController::familles()` → `GET /matieres/familles` (référentiel pour les selects).

**Front** :
- Formulaire matière (`/Matieres`) : select Famille (pré-remplit la couleur, modifiable), select Type de salle requis, case « effort soutenu ».
- `/ConfigMatieres` : bloc « Affectation rapide des familles » — liste des matières sans famille, suggestion automatique par `abbr_matiere` (`CFR/OTG/OFR→francais`, `SPC/SPHY→pc`, `MATHS→maths`, `HG→hist_geo`, `SVT→svt`, `ANG→anglais`, `ESP/ALL→lv2`, `EPS→eps`, `PHILO→philo`, `EDHC→edhc`, `ARTS/MUS/EM/TM→arts_em`, `TIC→tic`), validation en un clic.

**Seeder** (tenants existants) : `MatiereFamilleSeeder` — applique le mapping par `abbr_matiere`, laisse `null` si ambigu.

**Tests** :
- `matiere_accepte_famille_et_couleur`
- `familles_endpoint_retourne_le_referentiel`
- `config_matieres_suggere_les_familles_par_abbr`

---

### 0.2 — Grille horaire (`plages_horaires`)

**Migration** `xxxx_xx_xx_xxxxxx_create_plages_horaires_table.php` :
```
plages_horaires:
  id
  annee_scolaire_id  foreignId nullable            // grille par année (archivable)
  libelle            string(50)                     // "M1", "Récréation", "Pause méridienne"
  jour               enum(lundi..samedi) nullable   // null = tous les jours ouvrés (C5)
  ordre              unsignedSmallInteger           // position dans la journée
  heure_debut        time
  heure_fin          time
  type               enum('cours','recreation','pause_midi') default 'cours'
  actif              boolean default true
  timestamps
  index(['jour','ordre'])
```

**Modèle** `PlageHoraire` : scope `cours()`, scope `pourJour($jour)` (retourne les plages `jour = $jour` + `jour IS NULL`), accesseur `duree_minutes`.

**Backend** `PlageHoraireController` (routes sous `permission:parametrage` / `module:parametrage`) :
| Route | Rôle |
| --- | --- |
| `GET /plages-horaires` | Liste (groupée par jour côté front) |
| `POST /plages-horaires` | Création |
| `PUT /plages-horaires/{id}` | Modif |
| `DELETE /plages-horaires/{id}` | Suppression (refus si des créneaux `emploi_du_temps.plage_horaire_id` la référencent) |
| `POST /plages-horaires/dupliquer-jour` | `{ source: 'lundi', cibles: ['mardi','jeudi'] }` — recopie rapide |

Validations : `heure_fin > heure_debut` ; **pas de chevauchement** entre deux plages du même `jour` (en tenant compte des `jour IS NULL`) ; `ordre` unique par jour.

**Front** `/GrilleHoraire` (`front/src/components/grille/GrilleHoraire.jsx`) :
- Vue tableau : colonnes = jours ouvrés, lignes = plages ordonnées, code couleur par `type`.
- Ajout / édition inline d'une plage, bouton « Dupliquer ce jour vers… ».
- Garde-fou visuel : total d'heures de cours par jour.

**Seeder** `PlageHoraireSeeder` — grille type MENET :
```
Lun/Mar/Jeu/Ven : 07:30-08:25 / 08:25-09:20 / 09:20-10:15 / [récré 10:15-10:30] /
                  10:30-11:25 / 11:25-12:20 / [pause 12:20-15:00] /
                  15:00-15:55 / 15:55-16:50
Mercredi        : 07:30-08:25 / 08:25-09:20 / 09:20-10:15 / [récré] / 10:30-11:25 / 11:25-12:20
Samedi          : 07:30-08:25 / 08:25-09:20 / 09:20-10:15 / 10:15-11:10
```
(Plages de ~55 min = « heure » administrative ; paramétrable. Les séances de 2h occupent 2 plages contiguës.)

**Tests** :
- `crud_plage_horaire`
- `rejet_chevauchement_plages_meme_jour`
- `rejet_suppression_plage_referencee_par_un_creneau`
- `dupliquer_jour_recopie_les_plages`

---

### 0.3 — Salle attitrée + type de salle requis

**Migration** — incluse dans `..._etendre_tables_pour_edt.php` :
```
ALTER classes:
  + salle_id  foreignId nullable  constrained('salles') nullOnDelete
```
`salle_classe` (string) conservé — champ legacy, on ajoutera un `@deprecated` dans le modèle. Pas de suppression dans ce lot.

**Modèle** `Classe` : `salle_id` dans `$fillable`, relation `salle()`. `Salle` : relation `classesAttitrees()`.

**Backend** :
- `ClasseController::store/update` acceptent `salle_id` (`nullable|exists:salles,id`).
- Réponse enrichie : `capacite_ok` (bool) = `salle.capacite >= effectif_max_classe`.
- `SalleController` : ajouter `GET /salles/disponibles?type=` (salles actives, filtrables par type) pour les selects.

**Front** :
- Formulaire classe (`/Classes` création + `DetailsClasse`) : select « Salle attitrée » (liste des salles actives, badge capacité), alerte si capacité < effectif.
- Écran salles : colonne « Classe(s) attitrée(s) ».

**Migration douce des données** : commande artisan `edt:reconcilier-salles` (non destructive) — pour chaque classe avec `salle_classe` non vide et `salle_id` null, tente un match exact/`LIKE` sur `salles.nom` et propose (dry-run par défaut, `--apply` pour écrire).

**Tests** :
- `classe_accepte_salle_id`
- `reponse_classe_signale_capacite_insuffisante`
- `commande_reconcilier_salles_en_dry_run_ne_modifie_rien`

---

### 0.4 — Découpage en séances (`seances_types`)

**Migration** `xxxx_xx_xx_xxxxxx_create_seances_types_table.php` :
```
seances_types:
  id
  niveau_matiere_id  foreignId constrained('niveau_matieres') onDelete cascade   // C2
  duree_minutes      unsignedSmallInteger        // 55, 110, 90…  (1 plage, 2 plages, 1h30)
  nb_seances         unsignedSmallInteger        // occurrences/semaine
  frequence          enum('hebdomadaire','quinzaine') default 'hebdomadaire'
  tandem_code        string(20) nullable          // 'PC-SVT', 'LV2'…  (lie 2 séances-types)
  ordre              unsignedSmallInteger default 0
  timestamps
  index('niveau_matiere_id')
```

Exemple 3e (note P4, `2+1+1` en Maths, `2+1+1+1+1` en Français, `0+(2h)` quinzaine en SPC/SVT) :

| niveau_matiere | lignes `seances_types` |
| --- | --- |
| 3e · Maths | `{110, 1}` + `{55, 2}` |
| 3e · Compo Française | `{110, 1}` + `{55, 3}` *(le reste du « français » via Ortho/Oral)* |
| 3e · Hist-Géo | `{55, 4}` |
| 3e · SPC | `{110, 1, quinzaine, tandem:PC-SVT}` |
| 3e · SVT | `{110, 1, quinzaine, tandem:PC-SVT}` |
| 3e · EPS | `{110, 1}` |

**Modèle** `SeanceType` (relation `niveauMatiere()`), et sur `NiveauMatiere` : `seancesTypes()`.

**Backend** — étendre `VolumeHoraireController` (déjà le contrôleur des volumes) :
| Route | Rôle |
| --- | --- |
| `GET /seances-types/{niveau_id}?serie_id=` | Pour chaque `niveau_matiere` du niveau/série : volume horaire, lignes de séances, **total séances vs volume** + écart |
| `POST /seances-types` | `{ niveau_matiere_id, duree_minutes, nb_seances, frequence, tandem_code }` |
| `PUT /seances-types/{id}` / `DELETE /seances-types/{id}` | |
| `POST /seances-types/generer-depuis-volume/{niveau_id}` | Pré-remplissage : transforme chaque volume en `n × {55, 1}` (l'utilisateur ajuste ensuite) |

Validation souple : si `Σ(duree × nb × coef_quinzaine) ≠ volume_horaire`, on **avertit** sans bloquer (message dans la réponse), car les arrondis 55 min / quinzaine sont normaux.

**Front** — `/VolumeHoraire` étendu : chaque ligne matière devient **dépliable** → mini-tableau des séances (durée en plages : « 1 plage » / « 2 plages consécutives » / « 1h30 », nb/semaine, hebdo|quinzaine, tandem). Badge de cohérence vert/orange (« 4h50 placées / 4h prévues »). Bouton « Générer depuis les volumes » par niveau.

**Seeder** `SeanceTypeSeeder` : applique `generer-depuis-volume` à tous les niveaux (base 1 plage), puis surcharge les cas MENET connus (Français/Maths/Philo 2h, PC/SVT quinzaine) via une table de règles par `famille` + `niveau`.

**Tests** :
- `crud_seance_type`
- `generer_depuis_volume_cree_une_ligne_par_heure`
- `reponse_signale_ecart_seances_vs_volume`
- `suppression_niveau_matiere_cascade_les_seances`

---

### 0.5 — Indisponibilités des enseignants (`enseignant_indisponibilites`)

**Migration** `xxxx_xx_xx_xxxxxx_create_enseignant_indisponibilites_table.php` :
```
enseignant_indisponibilites:
  id
  enseignant_id      foreignId constrained('enseignants') onDelete cascade
  annee_scolaire_id  foreignId nullable
  jour               enum(lundi..samedi)
  plage_horaire_id   foreignId nullable constrained('plages_horaires') nullOnDelete
  heure_debut        time nullable      // alternative à plage_horaire_id : intervalle libre
  heure_fin          time nullable
  type               enum('bloquant','preference') default 'bloquant'
  motif              string(120) nullable
  timestamps
  index(['enseignant_id','jour'])
```
Contrainte applicative : `plage_horaire_id` **ou** (`heure_debut` + `heure_fin`) renseigné, pas les deux vides.

**Modèle** `EnseignantIndisponibilite` ; sur `Enseignant` : `indisponibilites()`.

**Backend** `EnseignantIndisponibiliteController` (routes sous `permission:enseignants` / `module:enseignants.indisponibilites`) :
`GET /enseignants/{id}/indisponibilites`, `POST`, `DELETE /indisponibilites/{id}`, et `GET /indisponibilites` (vue d'ensemble tous profs, pour le diagnostic).

**Front** :
- Onglet « Disponibilités » sur `DetailsEnseignant` : grille jours × plages, clic pour marquer bloquant / préférence / libre, champ motif.
- Écran d'ensemble `/Indisponibilites` : matrice enseignants × jours, lecture rapide des vacataires.

**Tests** :
- `crud_indisponibilite`
- `rejet_si_ni_plage_ni_intervalle`
- `indisponibilites_vue_ensemble_liste_tous_les_profs`

---

### 0.6 — Diagnostic de complétude + templates

**Backend** `EdtDiagnosticController::index` → `GET /edt/diagnostic-prerequis` :
```json
{
  "pret": false,
  "blocs": [
    { "code": "grille",        "ok": true,  "detail": "42 plages de cours réparties sur 6 jours" },
    { "code": "familles",      "ok": false, "detail": "3 matières sans famille : TIC, Conduite, …" },
    { "code": "salles_classe", "ok": false, "detail": "2 classes sans salle attitrée : 6e B, 3e C" },
    { "code": "capacite",      "ok": true,  "detail": null },
    { "code": "affectations",  "ok": false, "detail": "5e A · SVT : aucun enseignant affecté" },
    { "code": "seances",       "ok": true,  "detail": "Écart moyen séances/volume : 4 %" },
    { "code": "indispos",      "ok": true,  "detail": "Renseignées pour 3 vacataires / 3" }
  ]
}
```
Réutilise la logique de `VolumeHoraireController::conformite` pour les affectations manquantes.

**Front** `/DiagnosticEdt` — liste de contrôles avec ✔/�’ et lien direct vers l'écran de correction. Affiché aussi en encart en tête du futur écran de génération (Lot 2).

**Templates** — `back/database/templates/{college,lycee,lycee_complet,primaire}.json` + `TemplateService::appliquer` :
- nouveau bloc `plages_horaires` (grille par défaut, cf. 0.2) → inséré dans `plages_horaires`.
- `matieres[]` : `+ famille`, `+ salle_type_requis`, `+ effort_soutenu`.
- `niveau_matieres[]` : `+ seances` (ex. `[{ "plages": 2, "nb": 1 }, { "plages": 1, "nb": 2 }]`) → alimente `seances_types` après création du `niveau_matiere`.
- `TemplateService::$stats` : ajouter `plages_horaires`, `seances_types`.

**Tests** :
- `diagnostic_signale_les_manques`
- `diagnostic_pret_quand_tout_est_configure`
- `template_college_cree_la_grille_et_les_seances` (étend le test TemplateService existant)

---

## 5. Récapitulatif des livrables

### Migrations (tenant)
| Fichier | Contenu |
| --- | --- |
| `..._create_plages_horaires_table.php` | Nouvelle table |
| `..._create_seances_types_table.php` | Nouvelle table |
| `..._create_enseignant_indisponibilites_table.php` | Nouvelle table |
| `..._etendre_tables_pour_edt.php` | ALTER `matieres` (famille, couleur, salle_type_requis, effort_soutenu) + `classes` (salle_id) + `emploi_du_temps` (plage_horaire_id) |

### Modèles
`PlageHoraire`, `SeanceType`, `EnseignantIndisponibilite` (nouveaux) ; `Matiere`, `Classe`, `Salle`, `Enseignant`, `NiveauMatiere`, `EmploiDuTemps` (relations/fillable étendus).

### Contrôleurs / routes
`PlageHoraireController`, `EnseignantIndisponibiliteController`, `EdtDiagnosticController` (nouveaux) ; `VolumeHoraireController` (+ séances), `MatiereController` (+ familles), `ClasseController` (+ salle_id), `SalleController` (+ disponibles).

### Front (nouveaux écrans)
`/GrilleHoraire`, `/Indisponibilites` (+ onglet `DetailsEnseignant`), `/DiagnosticEdt` ; extensions de `/VolumeHoraire`, `/Matieres`, `/ConfigMatieres`, `/Classes` + `DetailsClasse`.

### Modules (ModuleSeeder + Menu.jsx + RoutesMenu.jsx)
- `parametrage.grille_horaire` — « Grille horaire »
- `parametrage.seances` *(ou garder dans `parametrage.volume_horaire` — à trancher)*
- `enseignants.indisponibilites` — « Disponibilités enseignants »
- `pedagogie_pilotage.diagnostic_edt` — « Diagnostic EDT »

### Seeders (tenants existants)
`MatiereFamilleSeeder`, `PlageHoraireSeeder`, `SeanceTypeSeeder` + commande `edt:reconcilier-salles`.

### Commandes artisan
`edt:reconcilier-salles` (dry-run / `--apply`).

---

## 6. Ordre de réalisation et estimation

| Étape | Sous-lots | Dépend de | Estimation |
| --- | --- | --- | --- |
| 1 | 0.1 Familles + couleur | — | ~0,5 j |
| 2 | 0.2 Grille horaire | — | ~1 j |
| 3 | 0.3 Salle attitrée | — | ~0,5 j |
| 4 | 0.4 Séances-types | 0.1, 0.2 | ~1,5 j |
| 5 | 0.5 Indisponibilités | 0.2 | ~1 j |
| 6 | 0.6 Diagnostic + templates | 0.1–0.5 | ~1 j |
| 7 | Câblage `NouvelEmploiDuTemps` sur les plages + salle attitrée | 0.2, 0.3 | ~0,5 j |

**Total : ~6 jours de développement.** Étapes 1–3 parallélisables.

---

## 7. Definition of Done

- [ ] `php artisan migrate:fresh --seed` passe ; `php artisan test` vert (existants + nouveaux).
- [ ] `./vendor/bin/pint` clean.
- [ ] Les 4 templates créent grille + familles + séances ; `demo:creer` produit un établissement « prêt à générer » (diagnostic tout vert).
- [ ] Création manuelle d'un créneau : choix d'une **plage** (plus de champ heure libre), salle **pré-remplie** par la salle attitrée, chevauchements toujours détectés.
- [ ] Écran `/DiagnosticEdt` liste correctement les manques sur un établissement partiellement configuré.
- [ ] `npm run lint` (front) clean ; `location.key` géré sur les nouvelles listes (cf. `project_classes_fix`).
- [ ] Aucune colonne existante supprimée/renommée ; `salle_classe` toujours lisible.
- [ ] Section « Lot 0 » ajoutée à `docs/chantier-emploi-du-temps.md` avec le statut ✅.
- [ ] 1 article d'aide in-app par nouvel écran (`HelpArticleSeeder`).

---

## 8. Matrice de non-régression

À re-vérifier **manuellement** avant chaque merge de sous-lot (en plus de `php artisan test` + `npm run lint`). Colonne « Sous-lot déclencheur » = celui qui touche la zone.

| Zone à re-tester | Vérification concrète | Sous-lot déclencheur |
| --- | --- | --- |
| **Saisie manuelle d'un créneau** | Créer un créneau via `/NouvelEmploiDuTemps` → il apparaît dans la grille `/EmploiDuTemps` ; `heure_debut`/`heure_fin` bien enregistrés | 0.2, 0.3, câblage §6-7 |
| **Détection de chevauchement** | Rejouer les 3 cas d'`EmploiDuTempsTest` à la main (classe / enseignant / salle) → toujours 422 | tous |
| **EDT mobile enseignant** | App Flutter → « Mon emploi du temps » → les créneaux s'affichent avec matière + horaire | 0.2, câblage |
| **EDT mobile parent/élève** | App → enfant → emploi du temps → affichage correct | 0.2, câblage |
| **Remplacements** | Créer un remplacement (`/Remplacements`) sur un créneau existant → pas d'erreur, créneau bien listé | 0.2, 0.3 |
| **Conformité EDT** (`/ConformiteEdt`) | Le rapport heures placées/prévues se calcule toujours | 0.4 |
| **Charge enseignants** (`/ChargeEnseignants`) | Totaux d'heures par prof inchangés | 0.4, 0.5 |
| **Volumes horaires** (`/VolumeHoraire`) | Ajout / édition / suppression d'un volume fonctionne comme avant, hors nouvelle section séances | 0.4 |
| **Config matières/niveaux** (`/ConfigMatieres`) | Sauvegarde établissement + niveau + classe (matières alternatives) inchangée | 0.1 |
| **CRUD matières** (`/Matieres`) | Créer / éditer / supprimer une matière sans renseigner les nouveaux champs → OK | 0.1 |
| **CRUD classes** (`/Classes`, `DetailsClasse`) | Créer / éditer une classe sans salle attitrée → OK ; `salle_classe` existant toujours affiché | 0.3 |
| **Salles** (`/Salles`, `PlanningSalle`) | Liste, planning salle, création inchangés | 0.3 |
| **Bulletins & relevés PDF** | Générer un bulletin → matières et coefficients corrects (lecture `niveau_matieres`) | 0.4 |
| **Application d'un template** | `POST /self/apply-template` (ou `/Archivage`→nouveau démarrage) sur un tenant neuf → stats cohérentes, aucune exception | 0.6 |
| **`php artisan demo:creer`** | L'établissement de démo se crée ; `/DiagnosticEdt` tout vert | 0.6 |
| **Sidebar / modules** | Les modules désactivés pour un établissement restent masqués ; les nouveaux apparaissent | 0.1–0.6 |
| **`migrate:fresh --seed`** | Passe sans erreur sur MySQL **et** SQLite (CI) | migrations |

**Procédure de merge d'un sous-lot :**
1. `php artisan test` + `./vendor/bin/pint --test` + `npm run lint` verts.
2. Lignes de la matrice dont la colonne « déclencheur » correspond → cochées à la main.
3. `php artisan migrate:fresh --seed` local OK.
4. Revue de diff : confirmer zéro `dropColumn` / `renameColumn` / suppression de route.

---

## 9. Ce que le Lot 0 ne fait PAS (rappel)

- Pas de génération automatique (Lot 2).
- Pas de catalogue de contraintes ni de validateur MENET (Lot 1).
- Pas de groupes parallèles LV2 / dédoublements ni de semaine A/B dans l'EDT (Lot 4).
- Pas de drag & drop ni d'export PDF couleur (Lot 3).
- `emploi_du_temps` gagne seulement `plage_horaire_id` (nullable) ; `generation_id` / `verrouille` / `groupe_id` / `semaine` arrivent au Lot 2.
