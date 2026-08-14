# Audit de tests — 3 couches (2026-08-14)

> **Mise à jour** : les 14 correctifs listés ci-dessous ont été appliqués (voir [Statut final des correctifs](#statut-final-des-correctifs) en fin de document). Le corps de l'audit ci-dessous est conservé tel qu'écrit initialement, à titre de référence.

Objectif : vérifier que l'application (backend Laravel, frontend React, mobile Flutter) fonctionne correctement avant mise en production, avec un focus sur les téléchargements de fichiers et la cohérence entre les templates Excel d'import et les formulaires de saisie manuelle. Recommandations d'amélioration en fin de document.

## Sommaire

- [Résultat des tests automatisés](#résultat-des-tests-automatisés)
- [Bug bloquant trouvé et corrigé](#bug-bloquant-trouvé-et-corrigé-déjà-appliqué-non-commité)
- [Cohérence templates d'import ↔ formulaires de saisie](#cohérence-templates-dimport--formulaires-de-saisie)
- [Téléchargements de fichiers](#téléchargements-de-fichiers)
- [Recommandations générales](#recommandations-générales)
- [Liste priorisée des correctifs restants](#liste-priorisée-des-correctifs-restants)

---

## Résultat des tests automatisés

| Couche | Commande | Résultat |
|---|---|---|
| Backend | `php artisan test` | ✅ 86/86 tests passent (après correction du bug ci-dessous) |
| Frontend | `npm run build` | ✅ build OK — bundle unique de ~1 Mo, non code-splitté (avertissement Vite, non bloquant) |
| Frontend | `npm run lint` | ⚠️ 583 erreurs / 118 warnings — dette préexistante (surtout `react/prop-types` manquants), pas de régression liée aux changements en cours |
| Mobile | `flutter analyze` | ✅ aucun problème |
| Mobile | `flutter test` | ❌ le seul test présent (`test/widget_test.dart`) est le boilerplate par défaut, jamais adapté au projet — il plante car il ne fournit pas le `Provider<AuthProvider>` requis par `main.dart`. **Aucune couverture de test réelle côté mobile.** |

---

## Bug bloquant trouvé et corrigé (déjà appliqué, non commité)

**Symptôme** : `Tests\Feature\SanctionTest::notifier_parent_marque_la_sanction` échouait avec une erreur 500.

**Cause racine** : `Eleve::parents()` (`back/app/Models/Eleve.php`) est une relation `belongsToMany` (portail multi-parents, jusqu'à 2 parents par élève liés via la table pivot `eleve_parent`) qui renvoie donc une `Collection`. Mais **7 fichiers** traitaient `$eleve->parents` comme s'il s'agissait d'un modèle `Parents` unique, en accédant directement à `$eleve->parents->id` ou `$eleve->parents->email_parent`. Une `Collection` étant toujours "truthy" en PHP (même vide), le garde-fou `if (!$eleve->parents)` ne protégeait jamais contre l'absence de parent, et l'accès à une propriété inexistante sur la collection levait une exception.

**Impact réel** : toute notification destinée à un parent plantait silencieusement en 500 côté serveur, empêchant l'envoi des notifications suivantes :
- Sanctions (`SanctionController`)
- Absences / retards (`AssiduitesController`, `EnseignantPortalController`)
- Nouvelles notes / notes modifiées (`NoteController`, `ImportNoteController`)
- Bulletin disponible (`NoteController`)
- Rappel de paiement en retard (`NotificationService`)
- Devoirs (`DevoirController`)

**Correctif appliqué** : remplacement des accès directs par une boucle `foreach ($eleve->parents as $parent)` (notification envoyée à chaque parent lié) et des gardes `isEmpty()` / `isNotEmpty()` à la place des tests de vérité sur l'objet `Collection`.

**Fichiers modifiés** :
- `back/app/Http/Controllers/API/SanctionController.php`
- `back/app/Services/NotificationService.php`
- `back/app/Http/Controllers/API/AssiduitesController.php`
- `back/app/Http/Controllers/API/DevoirController.php`
- `back/app/Http/Controllers/API/EnseignantPortalController.php`
- `back/app/Http/Controllers/API/NoteController.php`
- `back/app/Http/Controllers/API/ImportNoteController.php`

**Vérification** : les 86 tests backend passent désormais, y compris le test qui révélait le crash.

**Recommandation** : ajouter un test de non-régression générique sur ce pattern, pour éviter qu'un futur contrôleur retombe dans le même piège (voir [Recommandations générales](#recommandations-générales)).

---

## Cohérence templates d'import ↔ formulaires de saisie

Périmètre réel : les 5 contrôleurs `Import*Controller` (élèves, enseignants, affectations, scolarités, notes), chacun avec sa méthode `template()` (génération du xlsx) et `import()` (relecture). *Note : `TemplateController`/`TemplateService`/`SelfTemplateController` gèrent un système différent (templates de curriculum : niveaux/matières/séries appliqués à un établissement) et ne génèrent aucun fichier téléchargeable — hors périmètre de cet audit.*

### Import Élèves (`ImportEleveController.php`)

- 🔴 **Bloquant** — Le dropdown Excel "Handicap(s)" (colonne M) propose `moteur, malvoyant, malentendant, mental, autre`, alors que le formulaire manuel et la validation backend (`EleveController`) attendent `moteur, malvoyant, malentendant, albinisme, nanisme, begayement, autiste`. `mental` et `autre` n'existent dans aucune des deux listes. De plus, `ImportEleveController::import()` ne valide pas cette valeur contre un enum : un import avec "mental" crée un élève valide en base, mais toute édition manuelle ultérieure de cet élève échoue en 422 (champ handicap hors enum) — bloquant l'édition de champs sans rapport. Le checkbox correspondant n'apparaît même pas coché dans `DetailsEleve.jsx` (donnée invisible côté UI).
  → **Correctif recommandé** : aligner les deux listes sur les 7 valeurs déjà validées par `EleveController`, et ajouter la même validation d'enum dans `ImportEleveController::import()`.
- 🟡 **Gênant** — Si l'utilisateur oublie de supprimer la ligne d'exemple 3 du template (`EL001, KONE, Aminata...`), elle est importée comme un vrai élève (seules les lignes 1-2 sont sautées). Une ligne vide au milieu du fichier stoppe l'import de tout ce qui suit (`break` au lieu de `continue`), sans aucun message signalant les lignes ignorées.
- Mineur — Pas de contrôle de longueur de `nom_eleve`/`prenoms_eleve` à l'import (contrairement au formulaire manuel : max 100/150). Pas de validation de `genre_eleve` côté création manuelle (`EleveController::store`) alors que la colonne DB est un enum strict `M`/`F` et que l'import, lui, valide correctement — une requête API manuelle hors enum provoquerait une erreur SQL brute (500).
- ✅ Cohérents : dates JJ/MM/AAAA, genre M/F, langue2, statut_bourse, statut_orphelin — alignés entre template, import et formulaire.

### Import Enseignants (`ImportEnseignantController.php`)

- 🟠 **Sécurité / logique métier** — À l'import, un mot de passe prévisible est systématiquement généré (`Enseignant@{matricule}`, le matricule étant visible en clair dans le fichier Excel), et un compte portail est créé automatiquement dès qu'un téléphone est renseigné — sans consentement explicite. À la création manuelle, le mot de passe est un champ optionnel et le compte n'est lié que si téléphone **et** mot de passe sont fournis. L'import contourne donc le comportement opt-in du formulaire manuel.
  → **Correctif recommandé** : décider explicitement du comportement voulu (ex. colonne "Créer accès portail O/N" dans le template), et a minima forcer un changement de mot de passe à la première connexion.
- Mineur — Aucune contrainte d'unicité de `matricule_enseignant` côté création manuelle/DB (seul l'import la vérifie) : des doublons restent possibles via l'API directe.
- 🟡 Gênant — Même schéma ligne d'exemple / `break` silencieux que pour les élèves.
- Mineur (transversal, UX) — Format de date incohérent entre templates : JJ/MM/AAAA (élèves) vs AAAA-MM-JJ (enseignants, scolarités). Chaque template est cohérent en interne mais la différence entre fichiers du même outil est une source d'erreur de saisie.
- ✅ Cohérents : Genre M/F, Statut (`CDI,CDD,Stagiaire,Vacataire`) alignés avec l'enum DB et le formulaire.

### Import Affectations (`ImportAffectationController.php`)

- ✅ Aucune incohérence de champs : colonnes résolues vers les mêmes IDs que l'écran manuel, règles métier identiques (max 3 matières / 7 classes par enseignant) entre import et `EnseignantController`.
- 🟡 Gênant — Même point ligne d'exemple : ici générée dynamiquement à partir de données réelles en base, donc l'affectation créée si non supprimée est techniquement valide mais probablement non désirée.

### Import Scolarités (`ImportScolariteController.php`)

- ✅ Cohérent globalement : colonnes alignées avec `ScolariteController`, format de date AAAA-MM-JJ cohérent.
- Mineur — `montant_echeance` n'est validé que par "non vide", pas par un contrôle numérique, avant `Scolarites::create()` (colonne DB `decimal(10,2)`) → une valeur non numérique provoque une exception SQL brute (500) au lieu d'une erreur de ligne propre. Le même trou existe en saisie manuelle (validation backend `string|max:255` seulement).
- 🟡 Gênant — Même schéma ligne d'exemple / `break`.

### Import Notes (`ImportNoteController.php`)

- ✅ Le plus solide des cinq flux : template généré dynamiquement par devoir réel (pas de ligne d'exemple générique, donc pas de risque de faux enregistrement), validation Excel 0-20 alignée avec la validation serveur et l'UI (`SaisieNotes.jsx`). Aucune incohérence trouvée.

### Gestion des erreurs (transversal)

✅ Point positif : les 5 endpoints `import()` renvoient systématiquement `{ inseres, erreurs: [{ ligne, erreurs }], message }`, et les 5 écrans frontend affichent bien "Ligne X : ...". Le seul angle mort réel reste le `break` silencieux sur ligne vide, qui peut faire disparaître des lignes valides sans erreur associée.

---

## Téléchargements de fichiers

### Bulletins / relevés / tableaux PDF

✅ RAS. Génération et nommage corrects (`barryvdh/laravel-dompdf` encode correctement les noms accentués en RFC 5987), gestion des cas vides (divisions protégées, `findOrFail` → 404 propre).
- Mineur — Augmentation de `memory_limit`/`set_time_limit` pour les PDF groupés côté PHP, mais rien ne garantit que le pool PHP-FPM ou un reverse-proxy suivent la même config en prod (à vérifier en configuration serveur, hors code applicatif).

### Portail parent (bulletin PDF, reçu de paiement)

✅ **Sécurité correcte** : chaque méthode de `ParentPortalController` vérifie `abort_unless(in_array($eleveId, $this->eleveIds($parent)), 403)` avant de servir un document. Un parent ne peut pas accéder aux documents d'un autre enfant en devinant un ID.

### Export Stats Générales

- 🟠 **Gênant** — `StatsGenerales.jsx` est le seul export lourd du projet sans timeout axios augmenté : il hérite du timeout par défaut de 10s (`front/src/api/axios.js`), alors que ce rapport agrège 14 sections avec boucles PHP par élève. Comparer : bulletins classe 120s, tableau 180s, relevé annuel 90s, rapport ministère 120s, export comptable 120s. Risque réel de coupure côté client (`ECONNABORTED`) sur un établissement de taille moyenne/grande alors que le serveur continue de calculer. Côté backend, `exportExcel()` n'a pas non plus de `set_time_limit()` contrairement à `exportPdf()`.
- Mineur — Le `catch` de l'export affiche un message générique au lieu de décoder le blob d'erreur JSON comme le fait `lireErreurBlob()` ailleurs (`Bulletin.jsx`) : un message d'erreur backend précis n'est jamais montré à l'utilisateur.

### Export comptable

✅ Déjà couvert par 9 tests automatisés qui passent.
- Mineur / cosmétique — `genererExcel()` construit un header `Content-Disposition` manuel qui est en fait toujours écrasé par Laravel (code mort, trompeur). `genererFec()` en revanche utilise ce header manuel sans passer par l'encodage RFC 5987 de Laravel — sans risque aujourd'hui (noms composés uniquement de dates), mais fragile si le nom du fichier venait à inclure une donnée utilisateur.

### Exports CSV (élèves, paiements, notes)

✅ Tous utilisent `streamDownload()` avec BOM UTF-8 pour la compatibilité Excel.
- Mineur — `NoteController::exportCsv` construit le nom de fichier directement à partir de `$classe->nom_classe` sans slugification. Si un nom de classe contenait un caractère `"` ou un retour à la ligne, cela pourrait corrompre l'en-tête HTTP. Risque faible (nom de classe saisi par l'admin, format court) mais facile à corriger.

### Frontend React — gestion des téléchargements (~15 composants)

✅ Bonne qualité générale : `responseType: 'blob'`, `URL.revokeObjectURL()` systématique, indicateurs de chargement sur la quasi-totalité des boutons, timeouts adaptés à la volumétrie (sauf `StatsGenerales.jsx`, voir plus haut).
- 🟠 **Gênant** — `back/config/cors.php` a `'exposed_headers' => []`. Or `SaisieNotes.jsx` et `EnseignantDevoirs.jsx` tentent de lire `res.headers['content-disposition']` pour extraire le nom de fichier réel. Ce header n'étant pas "safelisté" CORS, il revient `undefined` dès que front et back ne sont pas sur exactement la même origine (cas du dev, potentiellement de la prod). Un fallback de nom de fichier existe donc ce n'est pas bloquant aujourd'hui, mais c'est une mauvaise configuration CORS latente.
- Mineur — Incohérence de style : `Bulletin.jsx` (export classe) ne fait pas `document.body.appendChild(lien)` avant `.click()`, contrairement au téléchargement individuel qui le fait. Fonctionne sur les navigateurs modernes testés mais à unifier.

### Mobile Flutter — bulletin PDF et reçu de paiement

C'est la couche la moins couverte (aucun test) et où le plus de problèmes concrets ont été trouvés :

- 🔴 **Bloquant à tester** — Aucune entrée `<queries>` dans `AndroidManifest.xml` pour les intents `ACTION_VIEW` sur `content://` + `application/pdf` (seuls `text/plain` et les schémas `http`/`https` sont déclarés). Combiné au fait que le résultat d'`OpenFile.open()` (type `OpenResult`) n'est **jamais vérifié** dans `pdf_downloader_io.dart` ni `scolarites_screen.dart`, cela peut se traduire par **aucun bulletin/reçu ne s'ouvrant jamais sur Android 11+ (API 30+, cible par défaut du projet), sans aucun message d'erreur affiché à l'utilisateur**. C'est le risque le plus sérieux de cet audit côté mobile.
  → **À tester impérativement sur un appareil/émulateur Android 11+ réel avant mise en production.**
  → **Correctif recommandé** : ajouter le bloc `<queries>` manquant, et vérifier `result.type != ResultType.done` pour afficher un message adapté.
- 🟠 **Gênant** — `scolarites_screen.dart` réimplémente en dur la logique `dart:io` (téléchargement + ouverture du reçu) au lieu de réutiliser l'abstraction multi-plateforme `ouvrirPdf()` déjà utilisée par `notes_screen.dart`. Si le web est un jour activé pour ce module, cet écran ne compilera pas (`dart:io` indisponible sur web).
- Mineur — Aucun nettoyage des fichiers PDF temporaires après ouverture (`getTemporaryDirectory()`) : ils s'accumulent dans le cache de l'app (non critique, purgeable par l'OS, mais à corriger par hygiène).
- Mineur — Les erreurs réseau (`DioException`) sont affichées via `e.toString()` brut (technique, en anglais) plutôt qu'un vrai message traduit.
- ✅ Points positifs vérifiés : `ResponseType.bytes` correctement utilisé pour récupérer les PDF, `FileProvider` Android correctement déclaré et compatible avec `getTemporaryDirectory()`, noms de fichiers construits uniquement à partir d'IDs numériques (aucun risque d'injection/traversal).

---

## Recommandations générales

1. **Écrire des tests mobile réels.** C'est actuellement la couche la moins couverte : le seul fichier de test présent est le boilerplate par défaut, non fonctionnel. Un simple smoke test avec les bons `Provider` (auth, etc.) donnerait déjà un filet de sécurité minimal.
2. **Réduire la dette ESLint progressivement** (583 erreurs actuelles), au moins sur les fichiers touchés par les futures PR, pour éviter qu'elle ne continue de grossir silencieusement.
3. **Code-splitter le bundle frontend** (actuellement 1 Mo en un seul chunk) via `import()` dynamique, pour améliorer le temps de chargement initial de l'application.
4. **Ajouter un test de non-régression** sur le pattern `Eleve::parents()` (relation `belongsToMany`), pour éviter qu'un futur nouveau contrôleur retombe dans le piège corrigé dans cet audit.
5. **Tester la couche mobile sur un vrai appareil Android 11+** avant mise en production, en particulier l'ouverture des PDF (bulletins, reçus) — c'est le point le plus incertain de tout cet audit car non vérifiable en environnement de développement seul.

---

## Liste priorisée des correctifs restants

Le bug de notification parent (7 fichiers) a déjà été corrigé et vérifié par les tests. Restent, par ordre de priorité :

| # | Sévérité | Correctif | Fichier(s) concernés |
|---|----------|-----------|------------------------|
| 1 | 🔴 Bloquant | Aligner l'enum "Handicap(s)" du template Excel élèves avec celui validé par `EleveController`, et ajouter la validation d'enum manquante dans `ImportEleveController::import()` | `back/app/Http/Controllers/API/ImportEleveController.php`, `EleveController.php` |
| 2 | 🔴 Bloquant à tester | Ajouter le bloc `<queries>` Android manquant pour les intents PDF `content://`, et vérifier `OpenResult.type` après `OpenFile.open()` | `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/lib/utils/pdf_downloader_io.dart`, `mobile/lib/screens/child/scolarites_screen.dart` |
| 3 | 🟠 Sécurité | Revoir la création automatique de compte portail + mot de passe prévisible à l'import enseignants ; aligner sur le comportement opt-in du formulaire manuel | `back/app/Http/Controllers/API/ImportEnseignantController.php` |
| 4 | 🟠 Gênant | Augmenter le timeout axios de `StatsGenerales.jsx` (comme les autres exports lourds) et ajouter `set_time_limit()` côté backend | `front/src/components/stats/StatsGenerales.jsx`, `back/app/Http/Controllers/API/StatsGeneralesController.php` |
| 5 | 🟠 Gênant | Faire de `scolarites_screen.dart` un simple appel à `ouvrirPdf()` au lieu de dupliquer la logique `dart:io` | `mobile/lib/screens/child/scolarites_screen.dart` |
| 6 | 🟠 Gênant | Exposer `Content-Disposition` dans la configuration CORS | `back/config/cors.php` (`exposed_headers`) |
| 7 | 🟡 Gênant (5 flux) | Protéger contre l'import accidentel de la ligne d'exemple, remplacer les `break` sur ligne vide par un `continue` + comptage des lignes ignorées | Les 5 `Import*Controller.php` |
| 8 | 🟡 Mineur | Harmoniser `StatsGenerales.jsx` avec le pattern `lireErreurBlob()` pour afficher les vraies erreurs backend | `front/src/components/stats/StatsGenerales.jsx` |
| 9 | 🟡 Mineur | Slugifier `$classe->nom_classe` avant de l'insérer dans un nom de fichier CSV | `back/app/Http/Controllers/API/NoteController.php` |
| 10 | 🟡 Mineur | Uniformiser le format de date entre tous les templates Excel (actuellement JJ/MM/AAAA élèves vs AAAA-MM-JJ enseignants/scolarités) | Les 5 `Import*Controller.php` |
| 11 | 🟡 Mineur | Ajouter une validation numérique de `montant_echeance` avant création (import et saisie manuelle) | `ImportScolariteController.php`, `ScolariteController.php` |
| 12 | 🟡 Mineur | Ajouter une contrainte d'unicité sur `matricule_enseignant` (DB + validation) | Migration enseignants, `EnseignantController.php` |
| 13 | 🟡 Mineur | Nettoyer les fichiers PDF temporaires après ouverture côté mobile | `mobile/lib/utils/pdf_downloader_io.dart`, `scolarites_screen.dart` |
| 14 | 🟡 Mineur | Retirer le header `Content-Disposition` manuel mort dans `ExportComptableController::genererExcel()` | `back/app/Http/Controllers/API/ExportComptableController.php` |

---

## Statut final des correctifs

Tous les correctifs ont été implémentés en 4 phases, chacune validée par la suite de tests (`php artisan test`, `npm run build`, `flutter analyze`) avant de passer à la suivante.

### Phase 1 — Corrections rapides (✅ terminée)
CORS `exposed_headers`, slug du nom de fichier CSV notes, suppression du header mort dans `ExportComptableController`, timeout + `set_time_limit()` sur l'export Stats Générales, affichage des vraies erreurs backend sur cet export.

### Phase 2 — Robustesse des imports Excel (✅ terminée)
Protection contre l'import de la ligne d'exemple (élèves, enseignants) et remplacement des `break` par `continue` sur ligne vide dans les **5** contrôleurs d'import (élèves, enseignants, affectations, scolarités, notes) — une ligne vide au milieu d'un fichier n'interrompt plus l'import des lignes suivantes. Validation numérique du montant de scolarité. Format de date uniformisé en JJ/MM/AAAA sur les 3 templates qui géraient une date (élèves, enseignants, scolarités) — le format AAAA-MM-JJ a été retiré du parsing car `date_create()` interprète les dates à slashs (`/`) en format américain (M/J/A), ce qui aurait silencieusement corrompu des dates lors du changement de format sans ce correctif.

### Phase 3 — Décisions produit (✅ terminée)
- **Enum handicap** : template, validation d'import et feuille de référence alignés sur les 7 valeurs déjà validées par `EleveController` (moteur, malvoyant, malentendant, albinisme, nanisme, begayement, autiste). Une valeur hors enum est désormais rejetée ligne par ligne à l'import au lieu d'être acceptée silencieusement.
- **Compte enseignant à l'import** : nouvelle colonne "Créer accès portail (O/N)" dans le template, opt-in explicite. Mot de passe généré aléatoirement (`Str::password(16)`) au lieu du motif prévisible `Enseignant@{matricule}`. Sans cette colonne à `O`, aucun compte portail n'est créé (comportement aligné sur la création manuelle).
- **Unicité `matricule_enseignant`** : contrainte `unique()` ajoutée dans la migration `create_enseignants_table` (tenant), et validation Laravel correspondante dans `EnseignantController::store`/`update`.
  **⚠️ Action requise de votre part** : cette migration a été éditée directement (convention du projet : une table = une migration). Elle ne s'applique pas rétroactivement aux bases tenant déjà provisionnées. Pour l'appliquer : soit `php artisan tenants:migrate-fresh` sur un environnement où la perte de données tenant est acceptable, soit vérifier d'abord qu'aucun tenant existant n'a de doublon de matricule enseignant (`SELECT matricule_enseignant, COUNT(*) FROM enseignants GROUP BY matricule_enseignant HAVING COUNT(*) > 1`) puis appliquer la contrainte manuellement par `ALTER TABLE` sur chaque base tenant concernée.
- Tests ajoutés : `tests/Feature/ImportEleveTest.php` (4 tests) et `tests/Feature/ImportEnseignantTest.php` (4 tests), couvrant ligne d'exemple, enum handicap, robustesse aux lignes vides, opt-in compte portail et mot de passe aléatoire.

### Phase 4 — Mobile (✅ terminée côté code, ⚠️ à valider sur appareil réel)
- `AndroidManifest.xml` : ajout du bloc `<queries>` manquant pour les intents PDF (`action.VIEW` + `mimeType application/pdf`), nécessaire sous Android 11+.
- `pdf_downloader_io.dart` : le résultat d'`OpenFile.open()` est désormais vérifié — une erreur explicite est levée (et remontée à l'utilisateur via le `SnackBar` existant) si aucune application ne peut ouvrir le PDF, si la permission est refusée ou si le fichier est introuvable.
- `scolarites_screen.dart` : réécrit pour appeler `ouvrirPdf()` (abstraction multi-plateforme) au lieu de dupliquer la logique `dart:io`/`open_file` en dur.
- Nettoyage automatique des anciens PDF du cache à chaque nouveau téléchargement.
- **Non vérifiable dans cet environnement** : l'ouverture effective d'un PDF sur un téléphone Android 11+ réel avec une visionneuse installée. `flutter analyze` est propre, mais un test manuel sur appareil/émulateur reste nécessaire avant mise en production.

### Non traité (hors scope de cette série de correctifs)
- **Phase 5 du plan de travail** (dette technique) : tests mobile automatisés plus larges, réduction de la dette ESLint (583 erreurs préexistantes), code-splitting du bundle frontend. Non attaqués dans cette session — voir [Recommandations générales](#recommandations-générales).
- **Ligne d'exemple non protégée pour `ImportAffectationController` et `ImportScolariteController`** : contrairement aux imports élèves/enseignants, leurs lignes d'exemple utilisent des données réelles/génériques (premier enseignant/classe/matière en base, ou "6ème" comme nom de niveau) qui pourraient légitimement correspondre à une vraie ligne saisie par l'utilisateur. Ajouter une détection automatique ferait courir un risque de faux positifs (ignorer une ligne réelle). Seul le correctif `break`→`continue` a été appliqué sur ces deux contrôleurs.
