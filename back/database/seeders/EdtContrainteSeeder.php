<?php

namespace Database\Seeders;

use App\Models\EdtContrainte;
use Illuminate\Database\Seeder;

/**
 * Catalogue des contraintes MENET (chantier EDT — Lot 1).
 * Idempotent (updateOrCreate par code) : conserve l'activation/pondération
 * déjà personnalisées par l'établissement pour les codes existants — seuls
 * `libelle` et `nature` sont réécrits.
 *
 *   php artisan db:seed --class=EdtContrainteSeeder
 */
class EdtContrainteSeeder extends Seeder
{
    private const CATALOGUE = [
        // ── Contraintes dures ───────────────────────────────────────────────
        ['ENSEIGNANT_DOUBLE',    'Un enseignant ne peut pas assurer deux cours en même temps', 'dure', 100],
        ['CLASSE_DOUBLE',        'Une classe ne peut pas suivre deux cours en même temps', 'dure', 100],
        ['SALLE_DOUBLE',         'Une salle ne peut pas accueillir deux classes en même temps', 'dure', 100],
        ['SALLE_SPECIALISEE',    'Physique-Chimie et SVT se font en laboratoire ; EPS au gymnase', 'dure', 80],
        ['NIVEAU_LABO_SIMULTANE', 'Pas deux classes du même niveau en salle spécialisée au même moment', 'dure', 60],
        ['EPS_HEURES_CHAUDES',   "L'EPS ne se place jamais entre 10 h et 16 h", 'dure', 70, ['debut' => '10:00', 'fin' => '16:00']],
        ['HG_PAS_CONSECUTIF',    "L'Histoire-Géographie n'est jamais placée sur deux heures consécutives", 'dure', 50],
        ['MATIERE_CONSECUTIVE',  'Pas deux heures consécutives dans la même discipline (hors exceptions)', 'dure', 30, ['familles_exemptees' => ['francais', 'maths', 'philo', 'pc']]],
        ['INDISPO_BLOQUANTE',    'Un cours ne peut pas tomber sur une indisponibilité bloquante de l\'enseignant', 'dure', 90],
        ['CAPACITE_SALLE',       'La salle doit pouvoir accueillir l\'effectif de la classe', 'dure', 40],
        ['SALLE_ATTITREE',       'Les élèves ne se déplacent pas : cours dans la salle attitrée de la classe (hors salle spécialisée)', 'dure', 20],
        ['VOLUME_HORAIRE',       'Le volume horaire réglementaire de chaque matière doit être respecté', 'dure', 30, ['tolerance_heures' => 0.5]],
        ['TANDEM_MEME_JOUR',     'Le tandem Physique-Chimie / SVT est placé le même jour', 'dure', 25],

        // ── Contraintes souples ─────────────────────────────────────────────
        ['REPARTITION_SEMAINE',  'Répartir les heures d\'une matière sur toute la semaine', 'souple', 5],
        ['PAS_5H_EFFORT',        'Éviter 5 heures consécutives de matières à effort soutenu en 6e/5e', 'souple', 8, ['max_consecutif' => 4]],
        ['TROUS_ENSEIGNANT',     'Limiter les heures creuses des enseignants', 'souple', 4],
        ['EQUILIBRE_JOURNEE',    'Équilibrer la charge horaire quotidienne des classes', 'souple', 3, ['ecart_max_heures' => 3]],
        ['INDISPO_PREFERENCE',   'Respecter autant que possible les préférences horaires des enseignants', 'souple', 4],
    ];

    public function run(): void
    {
        foreach (self::CATALOGUE as $c) {
            [$code, $libelle, $nature, $poids] = $c;
            $parametres = $c[4] ?? null;

            // Création : valeurs par défaut complètes.
            $contrainte = EdtContrainte::firstOrCreate(
                ['code' => $code],
                ['libelle' => $libelle, 'nature' => $nature, 'poids' => $poids, 'parametres' => $parametres, 'active' => true],
            );

            // Rejeu : on ne réécrit que le libellé et la nature (l'activation et
            // la pondération restées personnalisées par l'établissement sont
            // préservées).
            $contrainte->update(['libelle' => $libelle, 'nature' => $nature]);
        }
    }
}
