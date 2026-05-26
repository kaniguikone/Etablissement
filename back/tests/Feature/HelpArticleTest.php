<?php

namespace Tests\Feature;

use App\Models\HelpArticle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesTestData;
use Tests\TestCase;

class HelpArticleTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->connecterAdmin();
    }

    private function creerArticle(array $overrides = []): HelpArticle
    {
        return HelpArticle::create(array_merge([
            'titre'     => 'Article test',
            'contenu'   => 'Contenu de test suffisamment long.',
            'module'    => 'eleves',
            'categorie' => 'tutoriel',
            'ordre'     => 10,
            'actif'     => true,
        ], $overrides));
    }

    // ── Lecture publique ──────────────────────────────────────────────────────

    /** @test */
    public function index_retourne_uniquement_articles_actifs(): void
    {
        $this->creerArticle(['titre' => 'Actif']);
        $this->creerArticle(['titre' => 'Inactif', 'actif' => false]);

        $response = $this->getJson('/api/help');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('Actif', $data[0]['titre']);
    }

    /** @test */
    public function index_filtre_par_module(): void
    {
        $this->creerArticle(['module' => 'eleves']);
        $this->creerArticle(['module' => 'paiements']);

        $response = $this->getJson('/api/help?module=eleves');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('eleves', $data[0]['module']);
    }

    /** @test */
    public function index_recherche_par_titre(): void
    {
        $this->creerArticle(['titre' => 'Comment ajouter un élève']);
        $this->creerArticle(['titre' => 'Comment saisir un devoir']);

        $response = $this->getJson('/api/help?q=élève');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertStringContainsString('élève', $data[0]['titre']);
    }

    /** @test */
    public function index_recherche_dans_contenu(): void
    {
        $this->creerArticle(['contenu' => 'Pour créer un paiement espèces, cliquez sur...']);
        $this->creerArticle(['contenu' => 'Le bulletin se génère automatiquement.']);

        $response = $this->getJson('/api/help?q=paiement');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json());
    }

    /** @test */
    public function index_retourne_articles_ordonnes(): void
    {
        $this->creerArticle(['titre' => 'Troisième', 'ordre' => 30]);
        $this->creerArticle(['titre' => 'Premier',  'ordre' => 5]);
        $this->creerArticle(['titre' => 'Deuxième', 'ordre' => 15]);

        $titres = collect($this->getJson('/api/help')->json())->pluck('titre')->toArray();

        $this->assertEquals(['Premier', 'Deuxième', 'Troisième'], $titres);
    }

    // ── Interface admin ───────────────────────────────────────────────────────

    /** @test */
    public function admin_index_retourne_tous_articles_et_constantes(): void
    {
        $this->creerArticle(['actif' => true]);
        $this->creerArticle(['actif' => false]);

        $response = $this->getJson('/api/help/admin');

        $response->assertStatus(200)
                 ->assertJsonStructure(['articles', 'modules', 'categories']);

        $this->assertCount(2, $response->json('articles'));
        $this->assertArrayHasKey('eleves', $response->json('modules'));
        $this->assertArrayHasKey('tutoriel', $response->json('categories'));
    }

    /** @test */
    public function admin_index_filtre_par_categorie(): void
    {
        $this->creerArticle(['categorie' => 'tutoriel']);
        $this->creerArticle(['categorie' => 'faq']);

        $response = $this->getJson('/api/help/admin?categorie=faq');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('articles'));
        $this->assertEquals('faq', $response->json('articles.0.categorie'));
    }

    // ── CRUD admin ────────────────────────────────────────────────────────────

    /** @test */
    public function creer_article_valide(): void
    {
        $response = $this->postJson('/api/help', [
            'titre'     => 'Guide inscription élève',
            'contenu'   => 'Pour inscrire un élève, accédez au menu Élèves → Ajouter.',
            'module'    => 'eleves',
            'categorie' => 'prise_en_main',
            'ordre'     => 1,
            'actif'     => true,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('titre', 'Guide inscription élève');

        $this->assertDatabaseHas('help_articles', ['module' => 'eleves', 'categorie' => 'prise_en_main']);
    }

    /** @test */
    public function rejet_article_module_invalide(): void
    {
        $response = $this->postJson('/api/help', [
            'titre'     => 'Test',
            'contenu'   => 'Contenu de test.',
            'module'    => 'module_inexistant',
            'categorie' => 'tutoriel',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['module']);
    }

    /** @test */
    public function rejet_article_categorie_invalide(): void
    {
        $response = $this->postJson('/api/help', [
            'titre'     => 'Test',
            'contenu'   => 'Contenu de test.',
            'module'    => 'eleves',
            'categorie' => 'conseil_de_classe',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['categorie']);
    }

    /** @test */
    public function rejet_article_titre_manquant(): void
    {
        $response = $this->postJson('/api/help', [
            'contenu'   => 'Contenu sans titre.',
            'module'    => 'eleves',
            'categorie' => 'tutoriel',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['titre']);
    }

    /** @test */
    public function modifier_article(): void
    {
        $article = $this->creerArticle();

        $response = $this->putJson("/api/help/{$article->id}", [
            'titre'     => 'Titre modifié',
            'contenu'   => 'Contenu modifié.',
            'module'    => 'paiements',
            'categorie' => 'astuce',
            'ordre'     => 20,
            'actif'     => false,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('titre', 'Titre modifié')
                 ->assertJsonPath('module', 'paiements')
                 ->assertJsonPath('actif', false);
    }

    /** @test */
    public function supprimer_article(): void
    {
        $article = $this->creerArticle();

        $this->deleteJson("/api/help/{$article->id}")->assertStatus(204);
        $this->assertDatabaseMissing('help_articles', ['id' => $article->id]);
    }

    /** @test */
    public function supprimer_article_inexistant_retourne_404(): void
    {
        $this->deleteJson('/api/help/99999')->assertStatus(404);
    }

    /** @test */
    public function modifier_article_inexistant_retourne_404(): void
    {
        $this->putJson('/api/help/99999', [
            'titre'     => 'X',
            'contenu'   => 'X',
            'module'    => 'eleves',
            'categorie' => 'tutoriel',
        ])->assertStatus(404);
    }
}
