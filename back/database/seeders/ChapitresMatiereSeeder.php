<?php

namespace Database\Seeders;

use App\Models\ChapitreMatiere;
use App\Models\Matiere;
use App\Models\Niveau;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Crée un programme réaliste de chapitres pour chaque matière.
 * Les titres sont génériques (non spécifiques à un niveau) et servent
 * de référence commune à tous les enseignants de la matière.
 */
class ChapitresMatiereSeeder extends Seeder
{
    // Programme par abréviation de matière
    private const PROGRAMMES = [
        'MATH' => [
            ['Ensembles et calcul numérique',           'Prévoir 2 séances minimum'],
            ['Développement, factorisation, identités',  null],
            ['Équations et inéquations du 1er degré',   null],
            ['Fonctions — généralités et représentation',null],
            ['Systèmes d\'équations',                   null],
            ['Géométrie plane — triangles et polygones',null],
            ['Théorème de Pythagore et applications',   null],
            ['Statistiques descriptives',               'Prévoir exercices pratiques avec données réelles'],
            ['Probabilités — expériences aléatoires',  null],
            ['Trigonométrie de base',                   null],
        ],
        'FR' => [
            ['Expression écrite — le paragraphe argumentatif',  null],
            ['Orthographe et grammaire : accord du verbe',       null],
            ['Lecture analytique — le récit',                    'Apporter un texte support au choix'],
            ['Types et formes de phrases',                       null],
            ['Le discours rapporté direct et indirect',          null],
            ['Figures de style et expression littéraire',        null],
            ['La description et le portrait',                    null],
            ['La lettre formelle et le compte-rendu',            null],
            ['Le texte explicatif et documentaire',              null],
            ['La poésie — rythme et versification',              null],
        ],
        'ANG' => [
            ['Révisions grammaticales — temps de base',          null],
            ['Vocabulaire : la vie quotidienne',                 null],
            ['Le présent simple vs présent continu',             null],
            ['Le passé simple et passé composé',                 null],
            ['Le futur — will et be going to',                   null],
            ['Les modaux : can, must, should',                   null],
            ['La voix passive',                                  null],
            ['Compréhension orale — listening',                  'Prévoir matériel audio'],
            ['Expression écrite — rédiger un email',             null],
            ['Civilisation — pays anglophones',                  null],
        ],
        'SVT' => [
            ['La cellule — structure et fonctions',              null],
            ['La nutrition et la digestion',                     'Prévoir observation de lames'],
            ['La respiration et les échanges gazeux',            null],
            ['La reproduction sexuée et asexuée',               null],
            ['La génétique et l\'hérédité',                     null],
            ['L\'écosystème et les chaînes alimentaires',        null],
            ['La géologie — structure de la Terre',             'Sortie de terrain recommandée'],
            ['Les roches et minéraux',                           null],
            ['L\'évolution des espèces',                        null],
            ['Corps humain — système nerveux',                   null],
        ],
        'HG' => [
            ['Géographie : les grandes régions du monde',        null],
            ['Histoire : l\'Antiquité et les premières civilisations', null],
            ['Le Moyen Âge en Europe',                           null],
            ['Les grandes découvertes et la colonisation',       null],
            ['La Révolution française',                          null],
            ['Le XIXe siècle — industrialisation',              null],
            ['Les deux guerres mondiales',                       'Prévoir témoignages ou documents d\'archives'],
            ['La décolonisation et les indépendances africaines',null],
            ['Le monde contemporain depuis 1990',               null],
            ['Géographie : peuplement et urbanisation',          null],
        ],
        'SPC' => [
            ['La matière — atomes et molécules',                 null],
            ['Les mélanges et les solutions',                    'Prévoir séance de TP laboratoire'],
            ['Les transformations chimiques',                    null],
            ['L\'électricité — circuit et composants',          'Prévoir matériel de TP'],
            ['La loi d\'Ohm et ses applications',               null],
            ['L\'énergie électrique',                            null],
            ['Les forces et le mouvement',                       null],
            ['La lumière et les couleurs',                       null],
            ['Les ondes sonores',                                null],
            ['La chimie organique — introduction',              null],
        ],
        'EPS' => [
            ['Athlétisme — course et saut',                      null],
            ['Natation — sécurité et nages de base',            null],
            ['Sports collectifs — football',                     null],
            ['Sports collectifs — handball',                     null],
            ['Sports collectifs — volley-ball',                  null],
            ['Gymnastique au sol',                               null],
            ['Arts martiaux — initiation',                       null],
            ['Tennis de table',                                  null],
            ['Santé et hygiène de vie',                          null],
            ['Évaluation des compétences motrices',             'Prévoir grille d\'évaluation'],
        ],
        'MUSQ' => [
            ['La voix — technique vocale de base',               null],
            ['Lecture de partition — les notes',                 'Chaque élève doit avoir une partition'],
            ['Le rythme et la mesure',                           null],
            ['Instruments de musique du monde',                  null],
            ['Les genres musicaux',                              null],
            ['La musique africaine traditionnelle',             null],
            ['Composition et improvisation',                     null],
            ['Histoire de la musique classique',                 null],
        ],
        'AP' => [
            ['Dessin d\'observation — le trait',                'Prévoir matériel de dessin'],
            ['Les couleurs primaires et secondaires',            null],
            ['Techniques de peinture — aquarelle',              'Prévoir pinceaux et papier aquarelle'],
            ['Composition et équilibre visuel',                  null],
            ['La sculpture — modelage argile',                  'Prévoir argile'],
            ['L\'art africain — formes et symboles',            null],
            ['Photographie et image numérique',                  null],
            ['Projet artistique libre',                          'Projet évalué en fin de trimestre'],
        ],
        'PHI' => [
            ['Introduction à la philosophie — qu\'est-ce que philosopher ?', null],
            ['Le sujet — conscience et inconscient',             null],
            ['La connaissance et la vérité',                    null],
            ['La liberté et le déterminisme',                   null],
            ['Le travail et la technique',                       null],
            ['L\'État et le droit',                             null],
            ['La morale et l\'éthique',                        null],
            ['La religion et la raison',                        null],
            ['L\'art et le beau',                              null],
            ['Révision et méthodologie de dissertation',        'Prévoir au moins 2 dissertations en classe'],
        ],
        'ALL' => [
            ['L\'alphabet et la phonétique allemande',          null],
            ['Se présenter — Ich bin, ich habe',                null],
            ['La famille et l\'environnement',                  null],
            ['Le présent des verbes réguliers et irréguliers',  null],
            ['Les articles définis et indéfinis',               null],
            ['La négation et les questions',                    null],
            ['La vie quotidienne et les loisirs',               null],
            ['Prétérit et participe passé',                    null],
            ['Civilisation allemande',                          null],
        ],
        'ESP' => [
            ['Phonétique et prononciation espagnole',           null],
            ['Se présenter — ser, estar, tener',               null],
            ['La famille et la maison',                         null],
            ['Le présent de l\'indicatif',                     null],
            ['Les articles et les adjectifs',                  null],
            ['Les activités quotidiennes — reflexivos',        null],
            ['Le passé — prétérito indefinido',                null],
            ['La civilisation hispanique',                     null],
            ['Compréhension et expression orale',              'Prévoir supports audio'],
        ],
    ];

    public function run(): void
    {
        DB::table('chapitres_matiere')->truncate();

        $matieres = Matiere::all()->keyBy('abbr_matiere');
        $niveaux  = Niveau::all();

        if ($matieres->isEmpty()) {
            $this->command->warn('Aucune matière trouvée — lance DatabaseSeeder d\'abord.');
            return;
        }

        if ($niveaux->isEmpty()) {
            $this->command->warn('Aucun niveau trouvé — lance DatabaseSeeder d\'abord.');
            return;
        }

        $total = 0;

        // Créer le même programme pour chaque niveau (données de démo)
        foreach ($niveaux as $niveau) {
            foreach (self::PROGRAMMES as $abbr => $chapitres) {
                $matiere = $matieres[$abbr] ?? null;
                if (!$matiere) continue;

                foreach ($chapitres as $ordre => [$titre, $note]) {
                    ChapitreMatiere::create([
                        'matiere_id'     => $matiere->id,
                        'niveau_id'      => $niveau->id,
                        'titre'          => $titre,
                        'ordre'          => $ordre + 1,
                        'note_direction' => $note,
                    ]);
                    $total++;
                }
            }
        }

        $this->command->info("✓ $total chapitres créés ({$niveaux->count()} niveaux × " . count(self::PROGRAMMES) . " matières).");
    }
}
