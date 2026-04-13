<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\EvenementCalendrier;
use Illuminate\Database\Seeder;

/**
 * Peuple le calendrier scolaire avec les événements de l'année 2024-2025 :
 * vacances, examens, réunions, sorties scolaires.
 */
class CalendrierSeeder extends Seeder
{
    public function run(): void
    {
        // Récupérer quelques classes pour les événements ciblés
        $classes = Classe::inRandomOrder()->take(4)->pluck('id')->toArray();
        $c1 = $classes[0] ?? null;
        $c2 = $classes[1] ?? null;
        $c3 = $classes[2] ?? null;

        $evenements = [
            // ── Congés / Vacances ─────────────────────────────────────────────
            [
                'titre'       => 'Rentrée scolaire 2024-2025',
                'description' => 'Rentrée officielle des classes pour tous les niveaux.',
                'date_debut'  => '2024-09-02',
                'date_fin'    => '2024-09-02',
                'type'        => 'autre',
                'couleur'     => '#2c3e50',
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Vacances de Toussaint',
                'description' => 'Congé de Toussaint — cours suspendus.',
                'date_debut'  => '2024-10-26',
                'date_fin'    => '2024-11-03',
                'type'        => 'conge',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Vacances de Noël',
                'description' => 'Congé de fin d\'année — reprise le 06 janvier.',
                'date_debut'  => '2024-12-21',
                'date_fin'    => '2025-01-05',
                'type'        => 'conge',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Vacances de Carnaval',
                'description' => 'Congé de mi-année.',
                'date_debut'  => '2025-02-15',
                'date_fin'    => '2025-02-23',
                'type'        => 'conge',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Vacances de Pâques',
                'description' => 'Congé de printemps.',
                'date_debut'  => '2025-04-12',
                'date_fin'    => '2025-04-20',
                'type'        => 'conge',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Fin d\'année scolaire',
                'description' => 'Dernier jour de cours — délibérations et remise des résultats.',
                'date_debut'  => '2025-06-27',
                'date_fin'    => '2025-06-27',
                'type'        => 'autre',
                'couleur'     => '#2c3e50',
                'classe_id'   => null,
            ],

            // ── Examens / Devoirs de niveau ───────────────────────────────────
            [
                'titre'       => 'Compositions 1er trimestre',
                'description' => 'Devoirs de niveau du 1er trimestre — toutes classes.',
                'date_debut'  => '2024-11-18',
                'date_fin'    => '2024-11-22',
                'type'        => 'examen',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Compositions 2ème trimestre',
                'description' => 'Devoirs de niveau du 2ème trimestre.',
                'date_debut'  => '2025-02-24',
                'date_fin'    => '2025-02-28',
                'type'        => 'examen',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Épreuves blanches BEPC',
                'description' => 'Épreuves blanches du Brevet — classes de Troisième.',
                'date_debut'  => '2025-03-10',
                'date_fin'    => '2025-03-12',
                'type'        => 'examen',
                'couleur'     => '#c0392b',
                'classe_id'   => $c1,
            ],
            [
                'titre'       => 'Compositions finales 3ème trimestre',
                'description' => 'Examens de fin d\'année — toutes classes.',
                'date_debut'  => '2025-05-12',
                'date_fin'    => '2025-05-16',
                'type'        => 'examen',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Épreuves du Baccalauréat',
                'description' => 'Session du Baccalauréat — Terminales.',
                'date_debut'  => '2025-06-09',
                'date_fin'    => '2025-06-13',
                'type'        => 'examen',
                'couleur'     => '#c0392b',
                'classe_id'   => $c2,
            ],

            // ── Réunions ──────────────────────────────────────────────────────
            [
                'titre'       => 'Conseil de classe T1',
                'description' => 'Conseil de classe du 1er trimestre — tous niveaux.',
                'date_debut'  => '2024-12-09',
                'date_fin'    => '2024-12-13',
                'type'        => 'reunion',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Réunion parents-professeurs T1',
                'description' => 'Remise des bulletins et rencontre avec les parents.',
                'date_debut'  => '2024-12-14',
                'date_fin'    => '2024-12-14',
                'type'        => 'reunion',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Réunion pédagogique enseignants',
                'description' => 'Réunion mensuelle de l\'équipe pédagogique — Salle de conférence.',
                'date_debut'  => '2024-11-20',
                'date_fin'    => '2024-11-20',
                'type'        => 'reunion',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Conseil de classe T2',
                'description' => 'Conseil de classe du 2ème trimestre.',
                'date_debut'  => '2025-03-17',
                'date_fin'    => '2025-03-21',
                'type'        => 'reunion',
                'couleur'     => null,
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Réunion parents-professeurs T2',
                'description' => 'Remise des bulletins du 2ème trimestre.',
                'date_debut'  => '2025-03-22',
                'date_fin'    => '2025-03-22',
                'type'        => 'reunion',
                'couleur'     => null,
                'classe_id'   => null,
            ],

            // ── Sorties scolaires ─────────────────────────────────────────────
            [
                'titre'       => 'Visite du Musée National',
                'description' => 'Sortie culturelle au Musée National — classes de Sixième et Cinquième.',
                'date_debut'  => '2024-10-10',
                'date_fin'    => '2024-10-10',
                'type'        => 'sortie',
                'couleur'     => null,
                'classe_id'   => $c3,
            ],
            [
                'titre'       => 'Journée sport scolaire',
                'description' => 'Compétitions inter-classes de football et athlétisme.',
                'date_debut'  => '2025-01-25',
                'date_fin'    => '2025-01-25',
                'type'        => 'sortie',
                'couleur'     => '#27ae60',
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Visite de l\'entreprise Sochitel',
                'description' => 'Sortie professionnelle pour les Terminales.',
                'date_debut'  => '2025-02-06',
                'date_fin'    => '2025-02-06',
                'type'        => 'sortie',
                'couleur'     => null,
                'classe_id'   => $c2,
            ],

            // ── Autres ────────────────────────────────────────────────────────
            [
                'titre'       => 'Journée Portes Ouvertes',
                'description' => 'Présentation de l\'établissement aux futurs élèves et leurs familles.',
                'date_debut'  => '2025-01-18',
                'date_fin'    => '2025-01-18',
                'type'        => 'autre',
                'couleur'     => '#8e44ad',
                'classe_id'   => null,
            ],
            [
                'titre'       => 'Fête de l\'établissement',
                'description' => 'Cérémonie annuelle de remise des prix et spectacle culturel.',
                'date_debut'  => '2025-06-21',
                'date_fin'    => '2025-06-21',
                'type'        => 'autre',
                'couleur'     => '#f39c12',
                'classe_id'   => null,
            ],
        ];

        foreach ($evenements as $ev) {
            EvenementCalendrier::create($ev);
        }

        $this->command->info('✓ ' . count($evenements) . ' événements du calendrier créés.');
    }
}
