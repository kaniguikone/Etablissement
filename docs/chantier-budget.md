# Chantier — Gestion du budget de l'établissement

> Document de cadrage — Créé le 2026-09-11. **Lots 0 à 4 livrés le 2026-09-11.**

> **Avancement :**
> - **Lot 0 — Fondations** : ✅ livré. Migrations centrales (`tenants.budget_delegation_active`, `group_admins.super`/`permissions` avec backfill), migrations tenant (`budget_categories_depense`, `budget_dotations`, `budget_depenses`), modèles + trait `Auditable`, permissions `budget_gestion`/`budget_validation`, rôle `direction_generale`, correctif `AdminSeeder` (liste explicite pour `directeur`), middleware `group.permission`.
> - **Lot 1 — Demandes & validation** : ✅ livré. `BudgetDotationController` (CRUD + `soumettre`/`approuver`/`rejeter`, garde-fou §5.1, notifications via `NotificationService`), écran `BudgetDemandes.jsx`.
> - **Lot 2 — Dépenses & solde** : ✅ livré. `BudgetDepenseController` (CRUD + upload justificatif + blocage strict si dépassement de solde, endpoint `/budget/solde`), écran `BudgetDepenses.jsx`, référentiel `BudgetCategorieDepenseController` + écran `BudgetCategories.jsx`.
> - **Lot 3 — Vue groupe** : ✅ livré. `GroupBudgetController` (liste consolidée multi-tenants, `approuver`/`rejeter`/`toggleDelegation`, dashboard consolidé), écran `groupe/BudgetGroupe.jsx` (liste + toggle délégation par établissement).
> - **Affinage délégation (2026-09-11)** : la délégation ne s'accorde plus à « un rôle local » générique, mais à **une personne précisément désignée par la DG** (`tenants.budget_delegue_user_id`/`budget_delegue_nom`) — indépendamment des permissions/rôle habituels de cette personne côté établissement. Activer le toggle ouvre un sélecteur listant les utilisateurs de l'établissement ; la DG en choisit un. Vérifié en HTTP réel : une personne non désignée est bloquée avec un message nommant le délégué en place, la personne désignée peut approuver même sans permission `budget_validation` locale.
> - **Lot 4 — Tableau de bord établissement** : ✅ livré (partiel). Endpoint `/budget/dashboard` (répartition par catégorie + historique mensuel) + écran `BudgetTableauBord.jsx`. **Non livré : exports Excel/PDF et email de relance DG** — reportés faute de besoin confirmé à l'usage ; à reprendre si demandé.
> - **Lot 5 — Différé** : non livré (plafonds par catégorie, confirmation de réception des fonds, double validation au-delà d'un seuil) — inchangé, à reprendre seulement si le besoin se confirme à l'usage.
> - **Durcissement post-livraison (2026-09-12)**, trouvé en testant dans le navigateur avec de vrais comptes plutôt qu'en `tinker` :
>   - Un rôle `super` (bypass total) affichait quand même les boutons approuver/rejeter côté établissement, alors que le serveur les aurait refusés (établissement de groupe, pas de délégation) — la permission front ne reflétait pas la vraie règle. Nouvel endpoint `GET /budget/peut-valider` (`BudgetDotationController::peutValider`), interrogé par `BudgetDemandes.jsx` pour décider de l'affichage réel, avec le motif du refus affiché à la place des boutons quand ils sont masqués.
>   - La référence des dotations (`sprintf('BUD-%s-%03d', annee, sequence)`) n'était unique qu'au sein d'une base tenant — deux établissements du même groupe pouvaient produire la même référence visible côte à côte dans la vue consolidée DG. Corrigé en intégrant `Tenant::code` (déjà unique) : `BUD-{code_etablissement}-{annee}-{sequence}`.
>
> Vérifié en local : migrations appliquées sur les 3 tenants + base centrale, cycle complet demande→approbation→dépense→blocage testé via `tinker` **et** en conditions réelles au navigateur (Playwright, tokens Sanctum réels, plusieurs comptes), suite PHPUnit complète (170 tests / 555 assertions) au vert, build frontend (`npm run build`) sans erreur.

> **Décisions prises (cadrage du 2026-09-11) :**
> - La **Direction Générale (DG)** dispose d'un compte applicatif et **valide elle-même** les demandes de budget (vrai workflow demande → approbation, pas une simple trace administrative saisie par un tiers).
> - **Portée réelle du chantier : groupe d'établissements.** La DG est l'acteur **groupe** (`GroupAdmin`, modèle central existant), le DE est le directeur d'**un** établissement (tenant) membre du groupe. Le module doit aussi fonctionner pour un **établissement autonome** (sans groupe), auquel cas l'approbation se fait localement.
> - **Approbation prioritaire à la DG, délégable à une personne nommée** : par défaut, seule la DG du groupe approuve/rejette les demandes de chaque établissement membre ; elle peut désigner **une personne précise** de l'établissement (ex. le comptable) qui devient alors seule habilitée à approuver localement à sa place — pas « un rôle » générique, une personne choisie explicitement dans une liste. Sans groupe, l'approbation est locale d'office, régie par la permission `budget_validation` habituelle (pas de DG à qui déléguer).
> - **Pas d'enveloppe centrale de groupe avec plafond** : la DG octroie librement à chaque établissement, sans montant plafond suivi au niveau groupe. Elle dispose en revanche d'une **vue consolidée** (tableau de bord groupe agrégeant octrois/dépenses/soldes de tous ses établissements) — vue d'information, pas de contrôle de solde groupe.
> - **Enveloppe annuelle unique** par année scolaire et par établissement (éventuellement complétée par des rallonges exceptionnelles en cours d'année) — pas de dotations mensuelles/trimestrielles récurrentes automatiques.
> - **Contrôle de solde strict** : impossible d'enregistrer une dépense qui ferait passer le solde disponible en négatif (solde calculé par établissement).
> - **Catégories de dépenses informatives** uniquement en V1 (pas de plafond par catégorie) — un plafond configurable pourra être ajouté en Lot 4 si le besoin se confirme à l'usage.

---

## 1. Objectif

Permettre à la Direction Générale de **mettre à disposition** un budget de fonctionnement au Directeur d'Études (DE) de chacun de ses établissements, et au DE de **dépenser dans cette enveloppe** en traçant chaque sortie d'argent, avec :

1. une **demande de budget** initiée par le DE d'un établissement (montant, motif),
2. une **validation** par la DG du groupe (approuve, rejette, ou octroie un montant différent de celui demandé) — ou, si délégation activée, par un rôle local de l'établissement ; approbation locale d'office pour un établissement autonome (sans groupe),
3. une **saisie des dépenses** par le DE, imputées à l'enveloppe de l'année scolaire de *son* établissement, avec justificatif,
4. un **solde toujours visible** et **jamais négatif** (blocage à la saisie), calculé **par établissement**,
5. côté DG : un **tableau de bord consolidé** listant tous ses établissements (octroyé / dépensé / solde par école + vue globale), sans plafond central imposé,
6. côté établissement : un tableau de bord local (octroyé / dépensé / solde, répartition par catégorie) et des **exports**,
7. une **traçabilité complète** (qui a demandé, qui a validé — DG ou délégué —, qui a dépensé, quand) — exigence centrale du besoin exprimé.

**Deux modes de fonctionnement, un seul modèle de données par établissement :**
- **Établissement membre d'un groupe** (`tenants.group_id` renseigné) : la demande est approuvée par la DG (`GroupAdmin`) via l'API groupe, sauf délégation activée pour cet établissement.
- **Établissement autonome** (`tenants.group_id` nul) : approbation locale d'office, par un rôle tenant `budget_validation` (ex. le Directeur/Proviseur).

Les données métier (`budget_dotations`, `budget_depenses`) vivent **entièrement dans la base du tenant** concerné, jamais dupliquées côté central — seule l'*action* d'approbation, quand elle vient de la DG, traverse la frontière tenant via `tenancy()->initialize()`, sur le modèle déjà utilisé par `GroupDashboardController`/`GroupTenantController`.

---

## 2. État des lieux du code existant

| Brique réutilisable | Fichier | Usage prévu |
| --- | --- | --- |
| Rôles/permissions maison (table `roles`, colonne `permissions` JSON, `Role::PERMISSIONS`) | `back/app/Models/Role.php`, `back/app/Http/Middleware/CheckRole.php` | Ajout de 2 nouvelles clés de permission (§3). |
| `NotificationService` (notifierUser, push, email) | `back/app/Services/NotificationService.php` | Notifier la DG à la soumission, le DE à la validation/rejet, alerte solde bas. |
| Trait `Auditable` (opt-in, hooks Eloquent created/updating/deleted) | `back/app/Traits/Auditable.php` | Appliqué à `BudgetDotation` et `BudgetDepense`, comme `Paiement`. |
| Pattern d'upload fichier (disk `public`, `store()`, suppression avant remplacement) | `back/app/Http/Controllers/API/EleveController.php` | Justificatifs de dépense (factures/reçus scannés). |
| Statut calculé à la volée plutôt que stocké (`FraisAnnexeController::index`, L114) | `back/app/Http/Controllers/API/FraisAnnexeController.php` | Le **solde** de l'enveloppe budgétaire sera calculé (`SUM(dotations approuvées) − SUM(dépenses)`), jamais stocké en colonne dénormalisée. |
| Rattachement `annee_scolaire_id` / `periode_id` | ex. `devoirs`, `assiduites` | `BudgetDotation` et `BudgetDepense` rattachées à `annee_scolaire_id` ; `periode_id` nullable sur `BudgetDepense` pour un reporting trimestriel optionnel. |
| `Group` / `GroupAdmin` (groupe scolaire, auth centrale) | `back/app/Models/Group.php`, `back/app/Models/GroupAdmin.php`, `tenants.group_id` | La DG **est** un `GroupAdmin`. Auth via `POST /api/group/login`, middleware `account.type:App\Models\GroupAdmin`. |
| `GroupDashboardController` / `GroupTenantController` (boucle `tenancy()->initialize($tenant)` ... `tenancy()->end()`, agrégation en PHP) | `back/app/Http/Controllers/API/Group/` | Patron direct pour `GroupBudgetController` (§6) : lister/valider des demandes de plusieurs tenants sans requête SQL fédérée. |
| `Notification.owner_type`/`owner_id` (polymorphe « manuel », sans contrainte FK) | `back/app/Models/Notification.php` | Patron réutilisé pour `budget_dotations.validee_par_type`/`validee_par_id` (§4.2), car la DG n'est pas une ligne de la table `users` du tenant. |

### 2.1 Audit du système de permissions existant (point vérifié le 2026-09-11)

Vérification faite avant de conclure — le résultat corrige une hypothèse du cadrage précédent :

| Acteur | Mécanisme actuel | Verdict |
| --- | --- | --- |
| Super admin opérateur SaaS (éditeur) | Table centrale `super_admins`, hors tenant, aucun rôle/permission — accès total simplement par le type de compte (`account.type:App\Models\SuperAdmin`). | Bypass total **légitime** : c'est l'opérateur de la plateforme, pas un acteur métier d'un établissement. |
| Rôle tenant avec `roles.super = true` (ex. rôle seedé `super_admin` d'un établissement) | `Role::aPermission()` : `if ($this->super) return true;` — bypass total. | Existe et reste légitime (administrateur racine *d'un établissement donné*), mais distinct de l'opérateur SaaS. |
| Rôle `directeur` | **Pas** `super=true`. Liste **explicite** dans `roles.permissions` (JSON), vérifiée par `in_array()`, éditable via l'écran de gestion des rôles (`RoleController`). | ✅ Déjà conforme au principe « configuré comme tout autre rôle » — mon inquiétude initiale (wildcard) était infondée. |
| **Mais** : `AdminSeeder.php` calcule `directeur` via `array_diff($toutesPermissions, ['utilisateurs'])` (« tout sauf `utilisateurs` ») plutôt qu'une inclusion explicite comme `censeur`/`secretaire`/`comptable`. | Raccourci de **seeding**, pas un bypass runtime — mais dès qu'on ajoute `budget_validation` au catalogue `Role::PERMISSIONS`, ce raccourci l'inclurait automatiquement dans `directeur` pour tout **nouvel** établissement installé après ce chantier. | ⚠️ **À corriger** (§3.1) — sans quoi le DE d'un nouvel établissement se retrouverait de fait avec le pouvoir d'approbation, en contradiction avec la séparation DG/DE voulue. |
| `GroupAdmin` | Table `group_admins` : **aucune colonne `permissions`, aucun flag `super`**. Un groupe peut avoir plusieurs `GroupAdmin` (`Group::admins()` en `hasMany`), mais chacun a un accès total binaire dès qu'il est authentifié — pas de granularité. | ⚠️ **À corriger** (§3.2) — contredit directement l'exigence « les admins de groupe doivent aussi être configurés ». |

**Conclusion actée** : seul un acteur véritablement "opérateur/racine" (le `SuperAdmin` central, ou un rôle tenant explicitement marqué `super=true` par l'établissement lui-même) a un accès total implicite. Tout le reste — `directeur` compris, et désormais `GroupAdmin` aussi — doit passer par une permission explicitement accordée. Deux corrections entrent donc dans le périmètre du Lot 0 (§9).

---

## 3. Rôles et permissions

### 3.1 Côté tenant (établissement)

Deux nouvelles clés dans `Role::PERMISSIONS` :

| Clé | Porteur typique | Donne accès à |
| --- | --- | --- |
| `budget_validation` | Rôle local habilité — **utile pour un établissement autonome** (où elle conditionne réellement l'approbation) ; pour un établissement de groupe, elle donne accès à l'écran et à la visibilité, mais **n'autorise plus l'action d'approuver** — c'est la désignation nominative de la DG (§4.0) qui en décide. | Voir les demandes de l'établissement ; approuver/rejeter si autonome et titulaire de la permission, ou si groupe et désigné par la DG ; consulter le tableau de bord local. |
| `budget_gestion` | Directeur d'Études | Créer une demande de budget, saisir des dépenses, consulter son solde. |

**Correctif seeder (obligatoire, pas seulement une option)** : `AdminSeeder.php` doit passer le rôle `directeur` d'un raccourci `array_diff($toutesPermissions, ['utilisateurs'])` à une **liste d'inclusion explicite**, comme le sont déjà `censeur`/`secretaire`/`comptable` — ex. `['parametrage', 'inscriptions', 'eleves', 'sante', 'enseignants', 'parents', 'pedagogie_saisie', 'pedagogie_pilotage', 'finances_caisse', 'finances_gestion', 'communication', 'budget_gestion']`, **sans** `budget_validation` ni `utilisateurs`. Portée générale au-delà du seul module budget : ce correctif garantit que toute future permission ajoutée au catalogue ne se retrouve plus jamais accordée à `directeur` par accident. N'affecte que les **nouveaux** établissements installés après ce chantier — les établissements déjà seedés ont un `roles.permissions` déjà matérialisé en base, non recalculé rétroactivement ; `budget_gestion` devra y être ajouté à la main via l'écran de gestion des rôles (note pour le guide de déploiement).

Un nouveau rôle `direction_generale` (local) sera créé pour le cas *établissement autonome*, avec uniquement `budget_validation`. **`budget_validation` seule ne suffit pas à approuver si le tenant appartient à un groupe** — voir la règle de routage §5 : la permission ouvre l'écran et la visibilité, mais l'action d'approbation reste bloquée tant que la DG n'a pas explicitement délégué pour cet établissement.

### 3.2 Côté groupe (central) — nouveau système de permissions pour `GroupAdmin`

`GroupAdmin` n'a aujourd'hui ni `permissions`, ni `super` : accès total binaire dès l'authentification. Ce chantier introduit, pour `GroupAdmin`, le même principe que pour `Role` côté tenant — extension **centrale** de la table `group_admins` (migration hors `tenant/`) :

| Colonne | Type | Rôle |
| --- | --- | --- |
| `super` | bool, défaut `false` | Accès total au groupe (bypass), réservé au compte fondateur du groupe. |
| `permissions` | JSON nullable | Liste explicite parmi un catalogue `GroupAdmin::PERMISSIONS` (démarre avec `budget_validation` ; `ecoles`/`statistiques` pourront y être ajoutés plus tard pour couvrir `GroupTenantController`/`GroupDashboardController`, hors périmètre immédiat de ce chantier). |

Méthode `GroupAdmin::peutFaire(string $permission): bool` (miroir de `User::peutFaire()`) : `super` bypass, sinon `in_array($permission, $this->permissions ?? [])`.

**Migration de données (pas seulement de schéma)** : les `GroupAdmin` **existants** avant ce chantier ont, de fait, toujours eu un accès total (aucune notion de restriction n'existait) — la migration les passe donc à `super = true` pour ne rien casser rétroactivement. Tout **nouveau** `GroupAdmin` créé après ce chantier démarre avec `super = false` et `permissions = []` : il doit être explicitement configuré, comme demandé. Le compte fondateur créé par la commande `CreateGroup` reste `super = true` (c'est le propriétaire du groupe).

Nouveau middleware `group.permission:budget_validation` (miroir de `CheckRole`/`permission:xxx`) sur les routes d'approbation de `GroupBudgetController` (§6.2) — la lecture (liste des demandes, dashboard consolidé) reste accessible à tout `GroupAdmin` authentifié du groupe, seule l'**action d'approuver/rejeter/déléguer** exige `budget_validation` explicite ou `super`.

Gestion des permissions des `GroupAdmin` d'un groupe : écran minimal (liste des comptes DG du groupe + case à cocher `budget_validation`), accessible uniquement à un `GroupAdmin` `super=true` — une V1 volontairement réduite ; une vraie CRUD de rôles groupe (calquée sur `RoleController`) est hors périmètre de ce chantier et pourra être généralisée plus tard si d'autres permissions de groupe apparaissent.

---

## 4. Modèle de données cible

Une migration = une table (cf. convention du projet — pas de migrations fragmentées `add_xxx_to_yyy`), à l'exception de 4.0 ci-dessous qui étend une table centrale existante (comme `tenants.group_id` en son temps).

### 4.0 Extension centrale — `tenants.budget_delegation_active` / `budget_delegue_*`

Migrations **centrales** (`back/database/migrations/`, hors `tenant/`) :

| Colonne | Type | Rôle |
| --- | --- | --- |
| `budget_delegation_active` | bool, défaut `false` | La DG a délégué l'approbation budgétaire de **cet établissement**. Sans effet si `tenants.group_id` est nul (établissement autonome → approbation locale d'office, cf. §5). |
| `budget_delegue_user_id` | unsignedBigInteger nullable, **sans FK** | Id de l'utilisateur (table `users` du tenant, pas de contrainte cross-base) précisément désigné par la DG. Requis si `budget_delegation_active = true`. |
| `budget_delegue_nom` | string nullable | Nom en clair du délégué au moment de la désignation (snapshot), affiché dans le tableau « Par établissement » du portail groupe. |

Toggle + désignation exposés par la DG via `PUT /api/group/ecoles/{id}/budget/delegation` (`{actif, user_id}`) et `GET /api/group/ecoles/{id}/budget/delegables` pour lister les utilisateurs de l'établissement parmi lesquels choisir (§6.2) — jamais modifiable côté tenant lui-même (la délégation se donne, elle ne se prend pas). **La désignation est ce qui accorde le pouvoir d'approuver, indépendamment du rôle/permissions habituels de la personne choisie** — voir §5.1.

### 4.1 `budget_categories_depense` — référentiel paramétrable

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | pk | |
| `nom` | string | ex. « Fournitures », « Entretien », « Événements », « Urgences » |
| `actif` | bool, défaut `true` | |
| timestamps | | |

### 4.2 `budget_dotations` — cycle demande → octroi

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | pk | |
| `annee_scolaire_id` | fk `annees_scolaires`, cascade/restrict | Ancre l'enveloppe sur l'année scolaire. |
| `demandeur_id` | fk `users` | Le DE qui a initié la demande. |
| `reference` | string, unique | Généré : `BUD-{code_etablissement}-{annee_libelle}-{sequence:03d}`, ex. `BUD-TVJIBQ-2025-2026-001`. Le code établissement (`Tenant::code`, déjà unique par école) est indispensable dès qu'un groupe existe : la séquence seule n'est unique qu'au sein d'une base tenant, pas entre établissements — sans lui, deux écoles du même groupe peuvent produire la même référence visible côte à côte dans la vue consolidée DG. |
| `montant_demande` | decimal(12,2) | |
| `motif` | text | |
| `montant_octroye` | decimal(12,2) nullable | Rempli à l'approbation ; peut différer du montant demandé. |
| `statut` | enum `brouillon` / `soumise` / `approuvee` / `rejetee` | Voir workflow §5. |
| `validee_par_type` | enum `group_admin` / `user` nullable | Qui a statué — la DG (central, hors base tenant) ou un rôle local délégué. Pattern polymorphe « léger » déjà utilisé par `Notification.owner_type` (pas de contrainte FK, car `group_admins` n'est pas dans la base du tenant). |
| `validee_par_id` | unsignedBigInteger nullable, **sans FK** | Id dans `group_admins` (central) ou `users` (tenant) selon `validee_par_type`. |
| `validee_par_nom` | string nullable | Nom en clair au moment de la validation (snapshot), comme `AuditLog.user_nom` — évite une résolution cross-base pour un simple affichage. |
| `validee_le` | timestamp nullable | |
| `commentaire_validation` | text nullable | Motif du rejet ou remarque de la DG. |
| timestamps | | |

Trait `Auditable`.

### 4.3 `budget_depenses` — sorties d'argent

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | pk | |
| `annee_scolaire_id` | fk `annees_scolaires` | |
| `periode_id` | fk `periodes` nullable | Granularité trimestrielle optionnelle pour le reporting. |
| `categorie_id` | fk `budget_categories_depense` | |
| `libelle` | string | |
| `montant` | decimal(12,2) | |
| `date_depense` | date | |
| `beneficiaire` | string nullable | Fournisseur/prestataire payé. |
| `mode_paiement` | enum `especes` / `cheque` / `virement` / `mobile_money` / `autre` | Cohérent avec l'enum de `Paiement`. |
| `justificatif_path` | string nullable | Facture/reçu scanné, disk `public`. |
| `saisie_par_id` | fk `users` | Le DE qui a enregistré la dépense. |
| timestamps | | |

Trait `Auditable`. **Contrainte applicative (pas SQL)** : au moment du `store()`, vérifier `montant <= solde_disponible(annee_scolaire_id)` avant insertion (règle « blocage strict » actée en cadrage) ; sinon `422` avec le solde restant dans la réponse.

### 4.4 Calcul du solde (non stocké)

```
solde_disponible(annee_scolaire_id) =
    SUM(budget_dotations.montant_octroye WHERE statut = 'approuvee' AND annee_scolaire_id = ...)
  − SUM(budget_depenses.montant WHERE annee_scolaire_id = ...)
```

Exposé par un endpoint dédié (§6) et utilisé côté back pour le blocage, côté front pour l'affichage temps réel.

---

## 5. Workflow des statuts (`budget_dotations`)

```
brouillon ──soumettre──▶ soumise ──approuver──▶ approuvee ──(alimente le solde)
                            │
                            └──rejeter──▶ rejetee
```

- `brouillon` : le DE prépare sa demande, peut la modifier librement, invisible de la DG.
- `soumise` : verrouillée côté DE, visible du valideur autorisé (§5.1), notification envoyée.
- `approuvee` : `montant_octroye` + `validee_par_type`/`validee_par_id`/`validee_par_nom` + `validee_le` renseignés, notification au DE, le montant s'ajoute immédiatement au solde disponible.
- `rejetee` : `commentaire_validation` obligatoire, notification au DE ; le DE peut créer une nouvelle demande (pas de réédition d'une demande rejetée, pour garder l'historique intact).

### 5.1 Règle de routage de l'approbation (qui peut approuver quoi)

```
tenant.group_id est nul ?
  ├─ oui  → approbation LOCALE d'office (permission tenant `budget_validation`)
  └─ non  → tenant.budget_delegation_active ?
              ├─ false (défaut) → SEULE la DG du groupe peut approuver/rejeter
              │                    (endpoint local /budget/dotations/{id}/approuver renvoie 403)
              └─ true            → la DG PEUT toujours approuver (priorité),
                                    ET SEULEMENT la personne dont l'id == tenant.budget_delegue_user_id
                                    (pas « qui a budget_validation » — la désignation prime sur le rôle)
```

Concrètement, `BudgetDotationController::refuserSiApprobationNonAutorisee()` (appelée par `approuver`/`rejeter`) applique :
- établissement autonome (`group_id` nul) → vérifie `$request->user()->peutFaire('budget_validation')`, comme un contrôle d'accès classique ;
- établissement de groupe, délégation inactive → refuse avec « Cette demande doit être validée par la Direction Générale du groupe » ;
- établissement de groupe, délégation active → refuse sauf si `$request->user()->id === tenant.budget_delegue_user_id`, avec le message « Seule la personne désignée par la Direction Générale ({nom}) peut valider… » sinon.

Conséquence côté routes (`back/routes/tenant.php`) : `PUT /budget/dotations/{id}/approuver` et `/rejeter` ne portent **plus** le middleware `permission:budget_validation` — la personne désignée par la DG peut ne pas avoir cette permission localement (ex. un comptable désigné, qui n'a que `finances_caisse`/`finances_gestion`). L'autorisation est entièrement portée par le contrôleur ci-dessus ; le cas autonome y retrouve son équivalent du contrôle de permission. Vérifié en HTTP réel (tokens Sanctum réels, pas seulement en tinker) : une personne non désignée reçoit le 403 nommé, la personne désignée peut approuver même sans `budget_validation`.

Côté groupe, l'action d'approuver/rejeter/déléguer exige en plus `GroupAdmin::peutFaire('budget_validation')` (§3.2) — un `GroupAdmin` sans cette permission (et sans `super`) voit la liste des demandes mais ne peut pas statuer, même s'il appartient au bon groupe.

---

## 6. API

### 6.1 Côté tenant (`back/routes/tenant.php`)

Toutes sous middleware `permission:budget_gestion` ou `permission:budget_validation` selon l'action ; `approuver`/`rejeter` ajoutent le garde-fou §5.1.

| Verbe/route | Permission | Rôle |
| --- | --- | --- |
| `POST /budget/dotations` | `budget_gestion` | DE crée une demande (statut `brouillon` ou `soumise` direct). |
| `GET /budget/dotations` | `budget_gestion` ou `budget_validation` | Liste filtrable par statut/année. |
| `GET /budget/peut-valider` | `budget_gestion` ou `budget_validation` | `{autorise, motif}` — la vraie règle d'autorisation (§5.1), pour que le front sache s'il doit afficher les boutons approuver/rejeter plutôt que de se fier à la seule permission `budget_validation` (contournée par un rôle `super`). |
| `PUT /budget/dotations/{id}/soumettre` | `budget_gestion` | Passage `brouillon` → `soumise`. |
| `PUT /budget/dotations/{id}/approuver` | `budget_validation` + garde-fou §5.1 | Approbation locale (autonome, ou groupe avec délégation active), avec `montant_octroye`. |
| `PUT /budget/dotations/{id}/rejeter` | `budget_validation` + garde-fou §5.1 | Idem, avec `commentaire_validation` requis. |
| `apiResource /budget/depenses` | `budget_gestion` | CRUD dépenses, `POST` en `multipart/form-data` (justificatif). |
| `apiResource /budget/categories-depense` | `budget_validation` (paramétrage) | Référentiel. |
| `GET /budget/solde` | `budget_gestion` ou `budget_validation` | Solde courant + cumul octroyé/dépensé. |
| `GET /budget/dashboard` | `budget_gestion` ou `budget_validation` | Répartition par catégorie, historique mensuel. |
| `GET /budget/export-excel`, `/export-pdf` | idem | Cohérent avec `/stats/generales/export-*`. |

### 6.2 Côté groupe (`back/routes/api.php`, famille `/api/group/...`)

Middleware `auth:sanctum` + `account.type:App\Models\GroupAdmin`, même famille que `GroupDashboardController`/`GroupTenantController`. Implémentation en boucle `tenancy()->initialize($tenant)` → requête → `tenancy()->end()`, agrégation PHP (aucune requête fédérée cross-base, cf. §2).

| Verbe/route | Contrôleur | Rôle |
| --- | --- | --- |
| `GET /api/group/budget/dotations` | `GroupBudgetController@index` | Liste des demandes (filtrable par statut, par établissement) sur tous les tenants actifs du groupe. |
| `PUT /api/group/ecoles/{tenantId}/budget/dotations/{id}/approuver` | `GroupBudgetController@approuver` | Vérifie l'appartenance du tenant au groupe (`$request->user()->group->tenants()->findOrFail($tenantId)`), puis initialise la tenancy pour écrire l'approbation dans la base de cet établissement. |
| `PUT /api/group/ecoles/{tenantId}/budget/dotations/{id}/rejeter` | `GroupBudgetController@rejeter` | Idem. |
| `GET /api/group/ecoles/{tenantId}/budget/delegables` | `GroupBudgetController@delegables` | Liste des utilisateurs actifs de l'établissement (id, nom, rôle) parmi lesquels la DG choisit son délégué — initialise la tenancy pour lire `users`, aucun filtre par permission. |
| `PUT /api/group/ecoles/{tenantId}/budget/delegation` | `GroupBudgetController@toggleDelegation` | `{actif, user_id?}`. `user_id` requis si `actif=true` — vérifié comme existant dans le tenant (tenancy initialisée le temps du contrôle), puis `budget_delegation_active`/`budget_delegue_user_id`/`budget_delegue_nom` écrits sur la table centrale `tenants`. `actif=false` efface aussi `budget_delegue_*`. |
| `GET /api/group/budget/dashboard` | `GroupBudgetController@dashboard` | Vue consolidée : octroyé/dépensé/solde par établissement + totaux groupe — extension naturelle de `GroupDashboardController::stats`. |

---

## 7. Écrans front

### 7.1 Côté tenant (`front/src/components/budget/`) — ✅ tel que livré

Groupe sidebar « Budget » dans `Menu.jsx`. Pattern retenu : liste + modal (comme `FraisAnnexesConfig.jsx`, le module analogue le plus proche), plutôt que le pattern `Liste/Nouvel/Details` à trois fichiers envisagé initialement — plus simple pour ce volume d'actions, cohérent avec le reste du module finances.

- `BudgetDemandes.jsx` : liste + filtre statut + modal de création (DE) + actions approuver/rejeter en modal, **affichées seulement si `GET /budget/peut-valider` répond `autorise: true`** (interrogé au chargement, pas déduit de la permission locale) ; sinon le motif renvoyé par le serveur s'affiche à la place des boutons.
- `BudgetDepenses.jsx` : liste + modal de création avec upload justificatif, bandeau octroyé/dépensé/solde en tête, blocage strict affiché via toast d'erreur.
- `BudgetTableauBord.jsx` : KPIs octroyé/dépensé/solde, répartition par catégorie (barres), historique mensuel.
- `BudgetCategories.jsx` : CRUD du référentiel.

### 7.2 Côté groupe (`front/src/components/groupe/BudgetGroupe.jsx`) — ✅ tel que livré

Un seul écran consolidé (plutôt que deux séparés « Demandes » / « Budget du groupe » envisagés initialement) :

- KPIs groupe (octroyé/dépensé/solde totaux) en tête.
- Tableau « Par établissement » : octroyé/dépensé/solde + **toggle de délégation par école**. Activer le toggle ouvre un modal listant les utilisateurs de cet établissement (`GET .../budget/delegables`) — la DG choisit **une personne précise** dans un `<select>`, pas un rôle. Une fois désigné, son nom s'affiche en badge à côté du toggle. Désactiver ne redemande rien, ça efface juste la désignation.
- Tableau des demandes (filtrable par statut, toutes écoles confondues) avec actions approuver/rejeter en modal, comme côté tenant.

---

## 8. Notifications & audit

- Côté tenant, `NotificationService::notifierUser` : approbation/rejet → le `demandeur_id` ; solde disponible < seuil (ex. 10 %) → le DE. Ces notifications restent scopées à la base du tenant (modèle `Notification` local), comme aujourd'hui.
- **Vers la DG (soumission d'une demande)** : la DG n'est pas un `User` tenant, donc pas destinataire du modèle `Notification` tenant-scopé. En V1, elle voit les demandes en attente via le dashboard groupe (§7.2, mode « pull », comme `GroupDashboardController` aujourd'hui). Un email de relance (via `Mail`, indépendant de la connexion tenant) pourra être ajouté en Lot 3 si le pull ne suffit pas à l'usage.
- `AuditLog` via trait `Auditable` sur `BudgetDotation` et `BudgetDepense` : traçabilité complète des montants et changements de statut (y compris `validee_par_type`/`validee_par_nom`), consultable dans l'écran Audit existant du tenant concerné.

---

## 9. Lots de livraison

- **Lot 0 — Cadrage & fondations** : migration centrale `tenants.budget_delegation_active` (4.0), migration centrale `group_admins.super`/`group_admins.permissions` + backfill `super=true` sur les comptes existants + méthode `GroupAdmin::peutFaire()` + middleware `group.permission:xxx` (§3.2), correctif `AdminSeeder.php` (liste explicite pour `directeur`, §3.1), migrations tenant (4.1–4.3), modèles + trait `Auditable`, permissions `budget_validation`/`budget_gestion`, rôle `direction_generale`.
- **Lot 1 — Demandes & validation (mono-établissement)** : endpoints/écrans tenant de demande, soumission, approbation/rejet **en mode autonome uniquement** (garde-fou §5.1 posé mais groupe pas encore branché), notifications locales.
- **Lot 2 — Dépenses & solde** : saisie des dépenses avec justificatif, endpoint `/budget/solde`, blocage strict si dépassement.
- **Lot 3 — Vue groupe** : `GroupBudgetController` (liste/approuver/rejeter/déléguer/dashboard consolidé), écrans côté portail `GroupAdmin`, garde-fou §5.1 pleinement actif. C'est le lot qui donne au chantier tout son sens pour un groupe multi-établissements.
- **Lot 4 — Tableau de bord établissement & exports** : `TableauBordBudget.jsx` local, exports Excel/PDF, alerte solde bas, email de relance DG si besoin confirmé.
- **Lot 5 (différé, si besoin confirmé à l'usage)** : plafonds par catégorie, étape « confirmation de réception des fonds » par le DE, double validation au-delà d'un seuil sur les dépenses.

---

## 10. Prochaine étape

Valider ce cadrage, puis démarrer le **Lot 0** (migrations + rôles/permissions).
