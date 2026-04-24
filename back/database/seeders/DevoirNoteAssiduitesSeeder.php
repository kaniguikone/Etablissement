<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\Periodes;
use App\Models\TypeDevoir;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles :
 * - CHAQUE matière enseignée dans une classe a des devoirs — aucune matière ne peut
 *   être absente du bulletin.
 * - DC (Devoir de Classe) : 1 à 2 par matière × classe × période   (coeff 2)
 * - EI (Interrogation)    : 1 à 2 par matière × classe × période   (coeff 1)
 * - DN (Devoir de Niveau) : 1 par matière × niveau × période        (coeff 3)
 * - Notes    : 1 par élève par devoir
 * - Assiduités : 4 dates par matière × classe × période
 */
class DevoirNoteAssiduitesSeeder extends Seeder
{

    private const REMARQUES_ABSENT = ['Absent non justifié', 'Maladie', 'Absence justifiée', 'Raison familiale', ''];
    private const REMARQUES_RETARD = ['Retard transport', 'Retard non justifié', 'Problème de transport', ''];

    public function run(): void
    {
        DB::table('assiduites')->truncate();
        DB::table('notes')->truncate();
        DB::table('devoirs')->truncate();

        $classes     = Classe::with('eleves', 'niveau')->get();
        $periodes    = Periodes::all();
        $matieres    = Matiere::all()->keyBy('id');
        $typeDevoirs = TypeDevoir::all();

        if ($classes->isEmpty() || $periodes->isEmpty() || $typeDevoirs->isEmpty()) {
            $this->command->warn('Données de base manquantes. Lance DatabaseSeeder d\'abord.');
            return;
        }

        $ctx             = $this->command->seedContext ?? [];
        $devoirsMin      = max(1, (int) ($ctx['devoirs_min'] ?? 1));
        $devoirsMax      = max($devoirsMin, (int) ($ctx['devoirs_max'] ?? 2));
        $nbAssiduites    = max(1, (int) ($ctx['assiduites_par_periode'] ?? 3));

        $typeDC = $typeDevoirs->firstWhere('code_type_devoir', 'DC') ?? $typeDevoirs->first();
        $typeDN = $typeDevoirs->firstWhere('code_type_devoir', 'DN') ?? $typeDevoirs->get(1) ?? $typeDevoirs->first();
        $typeEI = $typeDevoirs->firstWhere('code_type_devoir', 'EI') ?? $typeDevoirs->get(2) ?? $typeDevoirs->first();

        // ── Matières de chaque classe depuis la table d'affectation ──────────
        $affectations = DB::table('classe_enseignant_matiere')->get();

        $matieresParClasse = []; // classe_id => [matiere_id, ...]
        foreach ($affectations as $row) {
            $matieresParClasse[$row->classe_id][] = $row->matiere_id;
        }
        foreach ($matieresParClasse as &$mats) {
            $mats = array_values(array_unique($mats));
        }
        unset($mats);

        // ── Élèves par classe et par niveau ───────────────────────────────────
        $elevesByClasse = [];
        $elevesByNiveau = [];
        foreach ($classes as $classe) {
            $ids = $classe->eleves->pluck('id')->toArray();
            $elevesByClasse[$classe->id] = $ids;
            $nid = $classe->niveau_id;
            $elevesByNiveau[$nid] = array_merge($elevesByNiveau[$nid] ?? [], $ids);
        }

        // ── Matières disponibles par niveau (union de toutes les classes) ──────
        $matieresParNiveau = [];
        foreach ($classes as $classe) {
            $nid = $classe->niveau_id;
            $matieresParNiveau[$nid] = array_values(array_unique(array_merge(
                $matieresParNiveau[$nid] ?? [],
                $matieresParClasse[$classe->id] ?? []
            )));
        }

        $niveaux      = Niveau::all();
        $totalDevoirs = 0;
        $totalNotes   = 0;
        $totalAssid   = 0;

        foreach ($periodes as $periode) {
            $code   = $periode->code_periode ?? 'T1';
            $datesD = $this->genererDates($periode->date_debut, $periode->date_fin, max(5, $devoirsMax * 2));
            $datesA = $this->genererDates($periode->date_debut, $periode->date_fin, $nbAssiduites);

            $notesBatch     = [];
            $assiduitesData = [];

            // ── DC et EI : pour CHAQUE matière de CHAQUE classe ──────────────
            foreach ($classes as $classe) {
                $matiereIds = $matieresParClasse[$classe->id] ?? [];
                $eleves     = $elevesByClasse[$classe->id]   ?? [];
                if (empty($matiereIds) || empty($eleves)) continue;

                $classeAbbr = preg_replace('/[^A-Za-z0-9]/', '', $classe->abbr_classe);

                foreach ($matiereIds as $matiereId) {
                    $mat = $matieres[$matiereId] ?? null;
                    if (!$mat) continue;

                    // DC : devoirs_min à devoirs_max par matière
                    $nbDC = rand($devoirsMin, $devoirsMax);
                    for ($n = 0; $n < $nbDC; $n++) {
                        $devoir = Devoir::create([
                            'code_devoir'    => sprintf('%s-%s-%s-%s-%02d',
                                $typeDC->code_type_devoir,
                                $mat->abbr_matiere,
                                $classeAbbr,
                                $code,
                                $n + 1
                            ),
                            'date_devoir'    => $datesD[$n % count($datesD)],
                            'coeff_devoir'   => 2,
                            'type_devoir_id' => $typeDC->id,
                            'matiere_id'     => $matiereId,
                            'classe_id'      => $classe->id,
                            'periode_id'     => $periode->id,
                        ]);
                        $totalDevoirs++;

                        foreach ($eleves as $eleveId) {
                            $notesBatch[] = [
                                'eleve_id'  => $eleveId,
                                'devoir_id' => $devoir->id,
                                'note'      => $this->noteAleatoire(),
                            ];
                        }
                    }

                    // EI : devoirs_min à devoirs_max interrogations par matière
                    $nbEI = rand($devoirsMin, $devoirsMax);
                    for ($n = 0; $n < $nbEI; $n++) {
                        $devoir = Devoir::create([
                            'code_devoir'    => sprintf('%s-%s-%s-%s-%02d',
                                $typeEI->code_type_devoir,
                                $mat->abbr_matiere,
                                $classeAbbr,
                                $code,
                                $n + 1
                            ),
                            'date_devoir'    => $datesD[($n + 2) % count($datesD)],
                            'coeff_devoir'   => 1,
                            'type_devoir_id' => $typeEI->id,
                            'matiere_id'     => $matiereId,
                            'classe_id'      => $classe->id,
                            'periode_id'     => $periode->id,
                        ]);
                        $totalDevoirs++;

                        foreach ($eleves as $eleveId) {
                            $notesBatch[] = [
                                'eleve_id'  => $eleveId,
                                'devoir_id' => $devoir->id,
                                'note'      => $this->noteAleatoire(),
                            ];
                        }
                    }

                    // Assiduités pour cette matière dans cette classe
                    foreach ($datesA as $date) {
                        foreach ($eleves as $eleveId) {
                            $statut = $this->statutAleatoire();
                            $assiduitesData[] = [
                                'date_assiduite' => $date,
                                'statut'         => $statut,
                                'remarque'       => $this->remarque($statut),
                                'eleve_id'       => $eleveId,
                                'matiere_id'     => $matiereId,
                                'periode_id'     => $periode->id,
                            ];
                        }
                    }
                }

                // Insertion par lots intermédiaire pour éviter les dépassements mémoire
                if (count($notesBatch) >= 5000) {
                    DB::table('notes')->insert($notesBatch);
                    $totalNotes += count($notesBatch);
                    $notesBatch  = [];
                }
                if (count($assiduitesData) >= 2000) {
                    DB::table('assiduites')->insert($assiduitesData);
                    $totalAssid    += count($assiduitesData);
                    $assiduitesData = [];
                }
            }

            // ── DN : 1 devoir de niveau par matière × niveau × période ────────
            foreach ($niveaux as $niveau) {
                $matiereIds = $matieresParNiveau[$niveau->id] ?? [];
                $eleves     = $elevesByNiveau[$niveau->id]   ?? [];
                if (empty($matiereIds) || empty($eleves)) continue;

                $niveauAbbr = preg_replace('/[^A-Za-z0-9]/', '', $niveau->abbr_niveau);

                foreach ($matiereIds as $idx => $matiereId) {
                    $mat = $matieres[$matiereId] ?? null;
                    if (!$mat) continue;

                    $devoir = Devoir::create([
                        'code_devoir'    => sprintf('%s-%s-%s-%s-01',
                            $typeDN->code_type_devoir,
                            $mat->abbr_matiere,
                            $niveauAbbr,
                            $code
                        ),
                        'date_devoir'    => $datesD[($idx + 1) % count($datesD)],
                        'coeff_devoir'   => 3,
                        'type_devoir_id' => $typeDN->id,
                        'matiere_id'     => $matiereId,
                        'niveau_id'      => $niveau->id,
                        'periode_id'     => $periode->id,
                    ]);
                    $totalDevoirs++;

                    foreach ($eleves as $eleveId) {
                        $notesBatch[] = [
                            'eleve_id'  => $eleveId,
                            'devoir_id' => $devoir->id,
                            'note'      => $this->noteAleatoire(),
                        ];

                        if (count($notesBatch) >= 5000) {
                            DB::table('notes')->insert($notesBatch);
                            $totalNotes += count($notesBatch);
                            $notesBatch  = [];
                        }
                    }
                }
            }

            // Vider les restes
            if (!empty($notesBatch)) {
                DB::table('notes')->insert($notesBatch);
                $totalNotes += count($notesBatch);
                $notesBatch  = [];
            }
            if (!empty($assiduitesData)) {
                DB::table('assiduites')->insert($assiduitesData);
                $totalAssid    += count($assiduitesData);
                $assiduitesData = [];
            }

            $this->command->info("  Période {$code} : OK");
        }

        $this->command->info("✓ {$totalDevoirs} devoirs créés.");
        $this->command->info("✓ {$totalNotes} notes créées.");
        $this->command->info("✓ {$totalAssid} assiduités créées.");
    }

    /** Génère $count dates réparties uniformément entre $debut et $fin */
    private function genererDates(string $debut, string $fin, int $count): array
    {
        $start = \Carbon\Carbon::parse($debut);
        $end   = \Carbon\Carbon::parse($fin);
        $days  = max(1, $start->diffInDays($end));
        $step  = max(1, (int) floor($days / ($count + 1)));
        $dates = [];
        for ($i = 1; $i <= $count; $i++) {
            $dates[] = $start->copy()->addDays($step * $i)->format('Y-m-d');
        }
        return $dates;
    }

    /** Note réaliste entre 4 et 20, distribution centrée sur 12-13 */
    private function noteAleatoire(): float
    {
        $n = (rand(400, 2000) + rand(400, 2000)) / 200;
        return round(min(20, max(4, $n)), 2);
    }

    /** 75 % présent, 15 % absent, 10 % retard */
    private function statutAleatoire(): string
    {
        $r = rand(1, 100);
        if ($r <= 75) return 'present';
        if ($r <= 90) return 'absent';
        return 'retard';
    }

    private function remarque(string $statut): ?string
    {
        return match ($statut) {
            'absent' => (self::REMARQUES_ABSENT[array_rand(self::REMARQUES_ABSENT)] ?: null),
            'retard' => (self::REMARQUES_RETARD[array_rand(self::REMARQUES_RETARD)] ?: null),
            default  => null,
        };
    }
}
