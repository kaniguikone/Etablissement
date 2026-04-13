<?php

namespace Database\Seeders;

use App\Models\Classe;
use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Informations;
use App\Models\Matiere;
use App\Models\Niveau;
use App\Models\Parents;
use App\Models\Periodes;
use App\Models\Scolarites;
use App\Models\TypeDevoir;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Matières ─────────────────────────────────────────────────────────
        $matieres = [
            ['MATH', 'Mathématiques'],
            ['FR',   'Français'],
            ['ANG',  'Anglais'],
            ['SVT',  'Sciences de Vie et de la Terre'],
            ['HG',   'Histoire-Géographie'],
            ['SPC',  'Sciences Physiques et Chimie'],
            ['EPS',  'Éducation Physique et Sportive'],
            ['MUSQ', 'Musique'],
            ['AP',   'Arts Plastiques'],
            ['PHI',  'Philosophie'],      // 1ère et Tle uniquement
            ['ALL',  'Allemand'],         // à partir de 4ième, pas avec ESP
            ['ESP',  'Espagnol'],         // à partir de 4ième, pas avec ALL
        ];
        foreach ($matieres as [$abbr, $libelle]) {
            Matiere::create([
                'abbr_matiere'        => $abbr,
                'libelle_matiere'     => $libelle,
                'description_matiere' => Str::slug($libelle),
            ]);
        }

        // ── Niveaux ──────────────────────────────────────────────────────────
        $niveaux = [
            ['Sixième',    '6ième'],
            ['Cinquième',  '5ième'],
            ['Quatrième',  '4ième'],
            ['Troisième',  '3ième'],
            ['Seconde',    '2nde'],
            ['Première',   '1ère'],
            ['Terminale',  'Tle'],
        ];
        foreach ($niveaux as [$nom, $abbr]) {
            Niveau::create(['nom_niveau' => $nom, 'abbr_niveau' => $abbr]);
        }

        // ── Périodes ─────────────────────────────────────────────────────────
        $periodes = [
            ['Premier Trimestre',   '1er Trim', 'T1', '2024-2025', '2024-09-02', '2024-12-20'],
            ['Deuxième Trimestre',  '2eme Trim', 'T2', '2024-2025', '2025-01-02', '2025-03-10'],
            ['Troisième Trimestre', '3eme Trim', 'T3', '2024-2025', '2025-03-15', '2025-05-20'],
        ];
        foreach ($periodes as [$libelle, $abbr, $code, $annee, $debut, $fin]) {
            Periodes::create([
                'libelle_periode'      => $libelle,
                'abbr_libelle_periode' => $abbr,
                'code_periode'         => $code,
                'annee'                => $annee,
                'date_debut'           => $debut,
                'date_fin'             => $fin,
            ]);
        }

        // ── Scolarités (5 échéances par niveau) ──────────────────────────────
        // Montants progressifs par niveau (1=6ième → 7=Tle)
        $montantsParNiveau = [
            1 => [50000, 50000, 40000, 40000, 30000],
            2 => [55000, 50000, 45000, 40000, 30000],
            3 => [55000, 50000, 45000, 45000, 35000],
            4 => [60000, 55000, 50000, 45000, 35000],
            5 => [60000, 55000, 50000, 45000, 40000],
            6 => [65000, 60000, 55000, 50000, 40000],
            7 => [70000, 65000, 60000, 55000, 45000],
        ];
        $datesEcheances = ['2024-10-05', '2024-11-05', '2024-12-05', '2025-01-05', '2025-02-05'];

        foreach (Niveau::all() as $rank => $niveau) {
            $montants = $montantsParNiveau[$rank + 1];
            foreach ($datesEcheances as $i => $date) {
                Scolarites::create([
                    'libelle_echeance'  => ($i + 1) . 'ème versement',
                    'date_echeance'     => $date,
                    'montant_echeance'  => $montants[$i],
                    'niveau_id'         => $niveau->id,
                ]);
            }
        }

        // ── Types de devoirs ──────────────────────────────────────────────────
        $typeDevoirs = [
            ['DN', 'Devoir de Niveau'],
            ['DC', 'Devoir de Classe'],
            ['EI', 'Interrogation Écrite'],
        ];
        foreach ($typeDevoirs as [$code, $desc]) {
            TypeDevoir::create([
                'code_type_devoir'        => $code,
                'description_type_devoir' => $desc,
            ]);
        }

        // ── Informations ──────────────────────────────────────────────────────
        $informations = [
            ['2024-10-05', 'Devoir de Mathématiques',    'Le devoir de Mathématiques des classes de Seconde aura lieu le 02/11/2024 à 15h en salle A1.'],
            ['2024-11-10', 'Congés de Toussaint',        'Les élèves sont en congé du 01/11/2024 au 03/11/2024.'],
            ['2024-12-05', 'Journée Porte Ouverte',      'Journée porte ouverte avec rencontre des professeurs et retrait des bulletins du 1er trimestre.'],
            ['2025-01-05', 'Devoir de SVT',              'Devoir de SVT des classes de Terminale le 15/01/2025 de 9h à 12h.'],
            ['2025-01-15', 'Réunion de rentrée',         'Réunion de rentrée du 2ème trimestre : rencontre entre le Proviseur et les parents d\'élèves.'],
            ['2025-02-10', 'Congés de Carnaval',         'Congé du 17/02/2025 au 21/02/2025.'],
            ['2025-03-05', 'Remise des bulletins T2',    'Les bulletins du 2ème trimestre seront remis aux parents le 15/03/2025 à partir de 8h.'],
            ['2025-03-20', 'Composition de fin d\'année','Les compositions du 3ème trimestre commencent le 10/05/2025.'],
        ];
        foreach ($informations as [$date, $titre, $contenu]) {
            Informations::create([
                'date_info' => $date,
                'titre'     => $titre,
                'contenu'   => $contenu,
            ]);
        }

        // ── Classes : 3 à 5 par niveau ────────────────────────────────────────
        foreach (Niveau::all() as $niveau) {
            $nbClasses = rand(3, 5);
            for ($i = 1; $i <= $nbClasses; $i++) {
                Classe::factory()->create([
                    'num_classe'  => $i,
                    'nom_classe'  => $niveau->nom_niveau . ' ' . $i,
                    'abbr_classe' => $niveau->abbr_niveau . $i,
                    'niveau_id'   => $niveau->id,
                ]);
            }
        }

        // ── Élèves : 20 à 35 par classe — on calcule d'abord le total ────────
        // Règle : chaque parent a entre 1 et 4 enfants (tous les parents ont au moins 1)
        $classeSizes = [];
        $totalEleves = 0;
        foreach (Classe::all() as $classe) {
            $nb = rand(20, 35);
            $classeSizes[$classe->id] = $nb;
            $totalEleves += $nb;
        }

        // ── Parents : assez pour couvrir tous les élèves (max 4/parent) ──────
        // Cible : ~2,5 enfants/parent en moyenne
        $nbParents = (int) round($totalEleves / 2.5);
        $nbParents = max((int) ceil($totalEleves / 4), $nbParents); // au moins ceil(N/4)
        Parents::factory()->count($nbParents)->create();
        $parentIds = Parents::pluck('id')->toArray();
        shuffle($parentIds);

        // ── Construire le pool de parent_id : 1 occurrence garantie, puis distribution ──
        // Chaque parent commence avec 1 enfant, on distribue le reste (max 4 total)
        $pool          = $parentIds;           // 1 enfant/parent garanti
        $childCount    = array_fill_keys($parentIds, 1);
        $available     = $parentIds;           // parents pouvant encore recevoir un enfant
        $restant       = $totalEleves - $nbParents;

        while ($restant > 0 && !empty($available)) {
            $idx = array_rand($available);
            $pid = $available[$idx];
            $pool[] = $pid;
            $childCount[$pid]++;
            $restant--;
            if ($childCount[$pid] >= 4) {
                array_splice($available, $idx, 1);
            }
        }
        shuffle($pool);

        // ── Créer les élèves en puisant dans le pool ───────────────────────
        $cursor = 0;
        foreach ($classeSizes as $classeId => $nb) {
            for ($j = 0; $j < $nb; $j++) {
                Eleve::factory()->create([
                    'classe_id' => $classeId,
                    'parent_id' => $pool[$cursor++],
                ]);
            }
        }

        // ── Enseignants ───────────────────────────────────────────────────────
        // 70 enseignants pour respecter max 3 matières et max 7 classes chacun
        Enseignant::factory()->count(60)->create();

        // Professeur principal : 1 par classe (round-robin)
        $enseignantIds = Enseignant::pluck('id')->toArray();
        $cursor = 0;
        foreach (Classe::all() as $classe) {
            $classe->update([
                'professeur_principal_id' => $enseignantIds[$cursor % count($enseignantIds)],
            ]);
            $cursor++;
        }

        // ── Seeders dépendants ────────────────────────────────────────────────
        $this->call(EtablissementSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(ClasseEnseignantMatiereSeeder::class);
        $this->call(EmploiDuTempsSeeder::class);
        $this->call(DevoirNoteAssiduitesSeeder::class);
        $this->call(PaiementSeeder::class);
        $this->call(ParentAuthSeeder::class);
        $this->call(EnseignantAuthSeeder::class);
        $this->call(PhotoEleveSeeder::class);
        $this->call(ChapitresMatiereSeeder::class);
        $this->call(ProgressionSeeder::class);
        $this->call(VolumeHoraireSeeder::class);
        $this->call(ImpaiesSeeder::class);
        $this->call(RecuPaiementSeeder::class);
        $this->call(NotificationSeeder::class);
        $this->call(CalendrierSeeder::class);
        $this->call(SanctionSeeder::class);
    }
}
