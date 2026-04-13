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
├── Feature/                  ← Tests de fonctionnalités (API)
│   ├── EleveTest.php         ← Tests CRUD des élèves
│   ├── EmploiDuTempsTest.php ← Tests des chevauchements horaires
│   ├── DashboardTest.php     ← Tests des statistiques
│   └── PaiementTest.php      ← Tests des paiements
└── Unit/
    └── ExampleTest.php       ← (exemples PHPUnit)
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
