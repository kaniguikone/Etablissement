<?php

namespace Database\Seeders;

use App\Models\AnneeScolaire;
use App\Models\AppreciationMatiere;
use App\Models\Classe;
use App\Models\DecisionConseil;
use App\Models\Eleve;
use App\Models\Matiere;
use App\Models\Periodes;
use Illuminate\Database\Seeder;

/**
 * Génère des décisions de conseil de classe et des appréciations par matière
 * pour toutes les périodes, afin de permettre le test du module d'archivage.
 *
 * Règle métier : les décisions de conseil ne sont saisies qu'au dernier conseil
 * (dernière période : T3 ou S2). Les appréciations par matière couvrent toutes
 * les périodes.
 */
class ConseilClasseSeeder extends Seeder
{
    // Distribution pondérée des décisions (doit totaliser 100)
    private array $poids = [
        'admis_felicitations'  => 10,
        'admis_encouragements' => 25,
        'admis'                => 38,
        'passage_conditionnel' => 12,
        'avertissement'        => 7,
        'blame'                => 4,
        'redoublement'         => 3,
        'exclu'                => 1,
    ];

    private array $appreciationsPositives = [
        "Élève sérieux(se) qui fournit un effort constant. Bonne progression.",
        "Très bon travail cette année. Continuez dans cette voie.",
        "Élève méritant(e), impliqué(e) et attentif(ve). Félicitations.",
        "Des résultats encourageants. Persévérance et rigueur sont au rendez-vous.",
        "Élève agréable, participatif(ve) et motivé(e). Bon trimestre.",
        "Peut mieux faire mais montre de bonnes dispositions. Encouragements.",
        "Travail soutenu et régulier. Continuez vos efforts.",
    ];

    private array $appreciationsNeutres = [
        "Des résultats irréguliers. Un effort de régularité est nécessaire.",
        "Élève capable mais manquant de régularité. Peut faire mieux.",
        "Doit redoubler d'efforts pour consolider ses acquis.",
        "Niveau insuffisant. Un travail plus sérieux s'impose.",
        "Des lacunes persistent. Un soutien est recommandé.",
        "Comportement à améliorer. Les résultats en pâtissent.",
    ];

    private array $appreciationsMatiere = [
        "Bon niveau. Participe activement.",
        "Assimilation correcte du programme.",
        "Des difficultés persistent. Travail à intensifier.",
        "Très bonne maîtrise des notions abordées.",
        "Élève attentif(ve) et rigoureux(se).",
        "Résultats insuffisants. Des efforts supplémentaires sont nécessaires.",
        "Bonne progression en cours de trimestre.",
        "Capacités réelles, mais irrégulier(ère) dans l'effort.",
        "Niveau satisfaisant. Peut encore progresser.",
        "Travail sérieux. Félicitations.",
    ];

    public function run(): void
    {
        $annee = AnneeScolaire::courante();

        if (!$annee) {
            $this->command->warn('  ⚠ Aucune année scolaire en cours — ConseilClasseSeeder ignoré.');
            return;
        }

        $periodes = Periodes::where('annee_scolaire_id', $annee->id)->orderBy('id')->get();

        if ($periodes->isEmpty()) {
            $this->command->warn('  ⚠ Aucune période trouvée — ConseilClasseSeeder ignoré.');
            return;
        }

        $dernierePeriode = $periodes->last();
        $eleves          = Eleve::where('statut_eleve', 'actif')->with('classe')->get();
        $matieres        = Matiere::pluck('id')->toArray();

        if ($eleves->isEmpty()) {
            $this->command->warn('  ⚠ Aucun élève actif trouvé — ConseilClasseSeeder ignoré.');
            return;
        }

        $nbDecisions    = 0;
        $nbAppreciations = 0;

        // ── Appréciations par matière (toutes les périodes) ──────────────────
        if (!empty($matieres)) {
            foreach ($periodes as $periode) {
                foreach ($eleves as $eleve) {
                    $nbMatieres = min(count($matieres), rand(4, 7));
                    $matieresEleve = collect($matieres)->shuffle()->take($nbMatieres);

                    foreach ($matieresEleve as $matiereId) {
                        AppreciationMatiere::updateOrCreate(
                            [
                                'eleve_id'   => $eleve->id,
                                'matiere_id' => $matiereId,
                                'periode_id' => $periode->id,
                            ],
                            [
                                'appreciation' => $this->appreciationsMatiere[array_rand($this->appreciationsMatiere)],
                            ]
                        );
                        $nbAppreciations++;
                    }
                }
            }
        }

        // ── Décisions de conseil (dernière période uniquement) ───────────────
        $pool = $this->construirePool();

        foreach ($eleves as $eleve) {
            $decision = $pool[array_rand($pool)];

            $isPositive = in_array($decision, ['admis_felicitations', 'admis_encouragements', 'admis']);
            $appList    = $isPositive ? $this->appreciationsPositives : $this->appreciationsNeutres;
            $apprGenerale = rand(0, 3) > 0  // 75% ont une appréciation générale
                ? $appList[array_rand($appList)]
                : null;

            DecisionConseil::updateOrCreate(
                [
                    'eleve_id'  => $eleve->id,
                    'periode_id'=> $dernierePeriode->id,
                ],
                [
                    'classe_id'             => $eleve->classe_id,
                    'decision'              => $decision,
                    'appreciation_generale' => $apprGenerale,
                ]
            );
            $nbDecisions++;
        }

        $this->command->info(
            "✓ {$nbDecisions} décisions de conseil (période : {$dernierePeriode->libelle_periode})" .
            " + {$nbAppreciations} appréciations par matière créées."
        );
    }

    /** Construit un tableau de décisions selon la distribution pondérée. */
    private function construirePool(): array
    {
        $pool = [];
        foreach ($this->poids as $decision => $poids) {
            for ($i = 0; $i < $poids; $i++) {
                $pool[] = $decision;
            }
        }
        shuffle($pool);
        return $pool;
    }
}
