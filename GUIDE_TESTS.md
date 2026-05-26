# Guide de prise en main des tests automatisés

## Qu'est-ce qu'un test automatisé ?

Un test automatisé est un programme qui vérifie que le code se comporte comme attendu. Plutôt que de tester manuellement chaque fonctionnalité après chaque modification, les tests le font automatiquement en quelques secondes.

**Exemple concret** : après avoir modifié la validation d'un élève, lancer les tests confirme instantanément que :
- Un élève sans matricule est bien rejeté
- Un élève valide est bien enregistré
- La modification d'un élève existant fonctionne correctement

---

## Architecture des tests de ce projet

```
back/tests/
├── Feature/                        ← Tests de fonctionnalités (API)
│   ├── EleveTest.php               ← Tests CRUD des élèves
│   ├── EmploiDuTempsTest.php       ← Tests des chevauchements horaires
│   ├── DashboardTest.php           ← Tests des statistiques
│   ├── PaiementTest.php            ← Tests des paiements de scolarité
│   ├── CalendrierTest.php          ← Tests du calendrier scolaire
│   ├── SanctionTest.php            ← Tests des sanctions élèves
│   ├── StatistiquesAvanceesTest.php← Tests des statistiques avancées
│   ├── FraisAnnexeTest.php         ← Tests frais annexes + paiements par élève
│   ├── HelpArticleTest.php         ← Tests documentation in-app (CRUD + recherche)
│   └── ExportComptableTest.php     ← Tests export Excel/FEC OHADA
└── Unit/
    └── ExampleTest.php             ← (exemples PHPUnit)
```

Les tests **Feature** simulent de vraies requêtes HTTP vers l'API et vérifient les réponses. Ce sont les plus utiles pour ce projet.

---

## Lancer les tests

Ouvrir un terminal dans le dossier `back/` :

```bash
# Lancer tous les tests
php artisan test

# Lancer uniquement les tests Feature
php artisan test --testsuite=Feature

# Lancer un fichier de test précis
php artisan test --filter EleveTest

# Lancer un seul test par son nom
php artisan test --filter creation_eleve_valide
```

### Exemple de sortie réussie

```
  PASS  Tests\Feature\EleveTest
  ✓ liste des eleves retourne 200           (0.45s)
  ✓ creation eleve valide                   (0.12s)
  ✓ creation eleve sans matricule retourne erreur (0.08s)
  ✓ modification eleve existant             (0.09s)
  ✓ suppression eleve existant              (0.07s)

  Tests:    5 passed (15 assertions)
  Duration: 0.81s
```

### Exemple de sortie avec erreur

```
  FAIL  Tests\Feature\EleveTest
  ✗ creation eleve valide

  ──────────────────────────────
  FAILED: Tests\Feature\EleveTest::creation_eleve_valide
  Expected status code 201 but received 500.
```

---

## Comprendre la structure d'un test

Voici un test expliqué ligne par ligne :

```php
/** @test */
public function creation_eleve_valide(): void
{
    // 1. ARRANGE : Préparer les données nécessaires
    $classe = $this->creerClasse();

    // 2. ACT : Exécuter l'action à tester
    $response = $this->postJson('/api/eleves', [
        'matricule_eleve'      => 'MAT001',
        'nom_eleve'            => 'KONÉ',
        'prenoms_eleve'        => 'Aminata',
        'date_naissance_eleve' => '2012-05-15',
        'classe_id'            => $classe->id,
    ]);

    // 3. ASSERT : Vérifier que le résultat est correct
    $response->assertStatus(201);                              // Code HTTP 201 = Créé
    $response->assertJsonPath('eleve.nom_eleve', 'KONÉ');     // La réponse contient le bon nom
    $this->assertDatabaseHas('eleves', [                      // La BDD contient l'élève
        'matricule_eleve' => 'MAT001'
    ]);
}
```

Le pattern **AAA** (Arrange / Act / Assert) est la structure de base de tout test.

---

## Base de données de test

Les tests utilisent une **base SQLite en mémoire** (`:memory:`) configurée dans `phpunit.xml`.
- Elle est **recréée à chaque test** grâce au trait `use RefreshDatabase`
- Elle n'affecte **jamais** la vraie base de données SQLite du projet
- Les migrations sont rejouées automatiquement avant chaque test

---

## Les assertions les plus utiles

| Assertion | Ce qu'elle vérifie |
|-----------|-------------------|
| `$response->assertStatus(200)` | Le code HTTP de la réponse |
| `$response->assertStatus(201)` | Ressource créée avec succès |
| `$response->assertStatus(422)` | Erreur de validation |
| `$response->assertStatus(204)` | Succès sans contenu (suppression) |
| `$response->assertJsonStructure(['data', 'total'])` | La réponse a ces clés |
| `$response->assertJsonPath('eleve.nom_eleve', 'KONÉ')` | Une valeur précise dans le JSON |
| `$response->assertJsonValidationErrors(['matricule_eleve'])` | Ce champ a une erreur de validation |
| `$this->assertDatabaseHas('eleves', ['nom_eleve' => 'X'])` | Un enregistrement existe en BDD |
| `$this->assertDatabaseMissing('eleves', ['id' => 5])` | Un enregistrement n'existe plus en BDD |

---

## Écrire un nouveau test

**Étape 1** : Créer un fichier dans `tests/Feature/`

```bash
# Depuis back/
php artisan make:test NouveauTest
```

**Étape 2** : Écrire le test

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NouveauTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function mon_premier_test(): void
    {
        // Votre test ici
        $response = $this->getJson('/api/niveaux');
        $response->assertStatus(200);
    }
}
```

**Étape 3** : Lancer pour vérifier

```bash
php artisan test --filter mon_premier_test
```

---

## Tests existants et ce qu'ils couvrent

### `EleveTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `liste_des_eleves_retourne_200` | L'API répond et retourne une structure paginée |
| `creation_eleve_valide` | Un élève complet peut être créé |
| `creation_eleve_sans_matricule_retourne_erreur` | La validation rejette les données incomplètes |
| `modification_eleve_existant` | Les modifications sont bien enregistrées |
| `suppression_eleve_existant` | La suppression retire bien l'élève de la BDD |

### `EmploiDuTempsTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `creation_creneau_valide` | Un créneau valide est bien créé |
| `rejet_si_heure_fin_avant_heure_debut` | Validation des heures |
| `rejet_si_chevauchement_classe` | Une classe ne peut pas avoir 2 cours en même temps |
| `rejet_si_chevauchement_enseignant` | Un enseignant ne peut pas enseigner 2 cours en même temps |
| `pas_de_chevauchement_si_autre_jour` | Les mêmes horaires sur un autre jour sont acceptés |
| `suppression_creneau` | La suppression fonctionne |

### `DashboardTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `stats_retourne_les_compteurs_corrects` | Les totaux retournés correspondent aux données |

### `PaiementTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `enregistrer_un_paiement_valide` | Un paiement complet est bien enregistré |
| `rejet_paiement_sans_montant` | La validation rejette un paiement sans montant |
| `recap_eleve_retourne_solde_correct` | Le calcul du solde (dû - payé) est correct |
| `suppression_paiement` | La suppression d'un paiement fonctionne |

### `FraisAnnexeTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `creer_un_frais_annexe_valide` | Création avec niveau, montant, catégorie |
| `creer_frais_annexe_sans_niveau` | Frais s'appliquant à tous les niveaux |
| `rejet_categorie_invalide` | Validation de l'enum categorie |
| `modifier_un_frais_annexe` | Mise à jour montant + nom |
| `supprimer_un_frais_annexe` | Suppression en base |
| `lister_frais_filtres_par_annee` | Filtre ?annee= |
| `vue_frais_par_eleve` | Récap total dû / payé / solde par élève |
| `calcule_solde_apres_paiement_partiel` | Statut "partiel" calculé correctement |
| `enregistrer_paiement` | POST /paiements-frais-annexes valide |
| `rejet_mode_invalide` | Mode de paiement inconnu rejeté |
| `supprimer_paiement` | DELETE /paiements-frais-annexes/{id} |
| `impayes_liste_eleves_avec_solde` | Tableau impayés rempli correctement |
| `impayes_exclut_eleves_soldes` | Élèves entièrement soldés exclus |
| `impayes_frais_non_obligatoires_exclus` | Seuls les obligatoires apparaissent |

### `HelpArticleTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `index_retourne_uniquement_actifs` | Articles inactifs masqués en lecture publique |
| `index_filtre_par_module` | ?module= filtre correctement |
| `index_recherche_par_titre` | ?q= cherche dans le titre |
| `index_recherche_dans_contenu` | ?q= cherche dans le contenu |
| `index_retourne_articles_ordonnes` | Tri par `ordre` ASC |
| `admin_index_retourne_tous_et_constantes` | Inactifs inclus + MODULES/CATEGORIES retournés |
| `admin_index_filtre_par_categorie` | Filtre admin ?categorie= |
| `creer_article_valide` | POST /help retourne 201 |
| `rejet_module_invalide` | Module inexistant → 422 |
| `rejet_categorie_invalide` | Catégorie hors enum → 422 |
| `rejet_titre_manquant` | Titre requis → 422 |
| `modifier_article` | PUT met à jour tous les champs |
| `supprimer_article` | DELETE 204 + absent en BDD |
| `supprimer_inexistant_retourne_404` | 404 sur ID inconnu |
| `modifier_inexistant_retourne_404` | 404 sur ID inconnu |

### `ExportComptableTest.php`
| Test | Scénario couvert |
|------|-----------------|
| `apercu_retourne_structure_sans_donnees` | Zéros retournés quand BDD vide |
| `apercu_totalise_paiements_scolarite` | total_scolarite + total_encaisse calculés |
| `apercu_totalise_paiements_frais_annexes` | total_frais_annexes calculé |
| `apercu_cumule_scolarite_et_frais` | Les deux types sommés ensemble |
| `apercu_filtre_par_date_debut` | Paiements antérieurs exclus |
| `apercu_par_mode_paiement` | Détail par mode (especes, cheque…) |
| `apercu_validation_date_invalide` | date_debut non-date → 422 |
| `export_excel_retourne_fichier_xlsx` | Content-Type xlsx, status 200 |
| `export_fec_retourne_fichier_csv` | Content-Type text/csv, status 200 |
| `export_format_invalide_retourne_erreur` | format=pdf → 422 |

---

## Commandes à connaître

```bash
# Depuis le dossier back/

# Lancer tous les tests
php artisan test

# Lancer avec plus de détails
php artisan test --verbose

# Arrêter dès le premier échec
php artisan test --stop-on-failure

# Lancer uniquement un groupe de tests
php artisan test tests/Feature/EleveTest.php
```

---

## En cas d'erreur "table not found"

Si tu vois une erreur du type `SQLSTATE[HY000]: no such table: eleves`, c'est que les migrations ne se sont pas exécutées. Vérifie que ton test utilise bien `use RefreshDatabase;` :

```php
class MonTest extends TestCase
{
    use RefreshDatabase; // ← Ne pas oublier cette ligne !
    ...
}
```

---

## En cas d'erreur après une nouvelle migration

Quand tu ajoutes une nouvelle migration (ex: `add_photo_to_eleves_table`), les tests la prennent en compte automatiquement grâce à `RefreshDatabase`. Aucune action supplémentaire n'est nécessaire.
