<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    /**
     * Catalogue des modules/sous-modules activables, calqué sur les groupes et
     * items de la sidebar école (front/src/components/Menu.jsx). Idempotent
     * (updateOrCreate par slug) car ce seeder central peut être rejoué plusieurs
     * fois (une fois par établissement seedé en local).
     */
    public function run(): void
    {
        $catalogue = [
            // Pas d'entrée dans la sidebar actuellement (menu masqué, cf. Menu.jsx) — catalogue prêt pour réactivation.
            ['slug' => 'inscriptions', 'label' => 'Inscriptions', 'enfants' => []],
            ['slug' => 'eleves', 'label' => 'Élèves', 'enfants' => [
                ['slug' => 'eleves.liste',       'label' => 'Liste des élèves'],
                ['slug' => 'eleves.nouveau',      'label' => 'Ajouter un élève'],
                ['slug' => 'eleves.attestations', 'label' => 'Attestations'],
                ['slug' => 'eleves.sanctions',    'label' => 'Sanctions'],
            ]],
            ['slug' => 'enseignants', 'label' => 'Enseignants', 'enfants' => [
                ['slug' => 'enseignants.liste',        'label' => 'Liste des enseignants'],
                ['slug' => 'enseignants.nouveau',       'label' => 'Ajouter un enseignant'],
                ['slug' => 'enseignants.profs_matiere', 'label' => 'Profs par matière'],
                ['slug' => 'enseignants.indisponibilites', 'label' => 'Indisponibilités'],
            ]],
            ['slug' => 'parents', 'label' => 'Parents', 'enfants' => [
                ['slug' => 'parents.liste',   'label' => 'Liste des parents'],
                ['slug' => 'parents.nouveau', 'label' => 'Ajouter un parent'],
                ['slug' => 'parents.demandes','label' => "Demandes d'accès"],
            ]],
            ['slug' => 'pedagogie_saisie', 'label' => 'Pédagogie', 'enfants' => [
                ['slug' => 'pedagogie_saisie.calendrier',      'label' => 'Calendrier scolaire'],
                ['slug' => 'pedagogie_saisie.emploi_du_temps', 'label' => 'Emploi du temps'],
                ['slug' => 'pedagogie_saisie.assiduites',      'label' => 'Assiduités'],
                ['slug' => 'pedagogie_saisie.devoirs',         'label' => 'Devoirs / Notes'],
                ['slug' => 'pedagogie_saisie.programme',       'label' => 'Programme'],
                ['slug' => 'pedagogie_saisie.remplacements',   'label' => 'Remplacements'],
            ]],
            ['slug' => 'pedagogie_pilotage', 'label' => 'Pilotage pédagogique', 'enfants' => [
                ['slug' => 'pedagogie_pilotage.bulletins',          'label' => 'Bulletins'],
                ['slug' => 'pedagogie_pilotage.suivi_progressions', 'label' => 'Suivi des progressions'],
                ['slug' => 'pedagogie_pilotage.conseil_classe',     'label' => 'Conseil de classe'],
                ['slug' => 'pedagogie_pilotage.conformite_edt',     'label' => 'Conformité EDT'],
                ['slug' => 'pedagogie_pilotage.charge_enseignants', 'label' => 'Charge enseignants'],
                ['slug' => 'pedagogie_pilotage.diagnostic_edt',     'label' => 'Diagnostic EDT'],
                ['slug' => 'pedagogie_pilotage.generer_edt',        'label' => 'Générer les EDT'],
                ['slug' => 'pedagogie_pilotage.controle_edt',       'label' => 'Contrôle EDT'],
            ]],
            ['slug' => 'finances_caisse', 'label' => 'Caisse', 'enfants' => [
                ['slug' => 'finances_caisse.nouveau_paiement', 'label' => 'Nouveau paiement'],
                ['slug' => 'finances_caisse.historique',       'label' => 'Historique'],
                ['slug' => 'finances_caisse.recap',            'label' => 'Récap par niveau'],
                ['slug' => 'finances_caisse.echeancier',       'label' => 'Échéancier'],
            ]],
            ['slug' => 'finances_gestion', 'label' => 'Finances', 'enfants' => [
                ['slug' => 'finances_gestion.scolarites',           'label' => 'Scolarités'],
                ['slug' => 'finances_gestion.impayes',              'label' => 'Tableau des impayés'],
                ['slug' => 'finances_gestion.frais_annexes',        'label' => 'Frais annexes'],
                ['slug' => 'finances_gestion.impayes_frais_annexes','label' => 'Impayés frais annexes'],
                ['slug' => 'finances_gestion.export_comptable',     'label' => 'Export comptable'],
            ]],
            ['slug' => 'communication', 'label' => 'Communication', 'enfants' => [
                ['slug' => 'communication.informations', 'label' => 'Informations'],
                ['slug' => 'communication.messagerie',   'label' => 'Messagerie'],
                ['slug' => 'communication.rdv',          'label' => 'RDV Parents-Profs'],
            ]],
            ['slug' => 'utilisateurs', 'label' => 'Administration', 'enfants' => [
                ['slug' => 'utilisateurs.utilisateurs',  'label' => 'Utilisateurs'],
                ['slug' => 'utilisateurs.roles',         'label' => 'Rôles et permissions'],
                ['slug' => 'utilisateurs.audit_logs',    'label' => "Journal d'audit"],
                ['slug' => 'utilisateurs.documentation', 'label' => 'Documentation in-app'],
            ]],
            ['slug' => 'parametrage', 'label' => 'Paramétrage', 'enfants' => [
                ['slug' => 'parametrage.etablissement',   'label' => 'Établissement'],
                ['slug' => 'parametrage.niveaux',         'label' => 'Niveaux'],
                ['slug' => 'parametrage.classes',         'label' => 'Classes'],
                ['slug' => 'parametrage.matieres',        'label' => 'Matières'],
                ['slug' => 'parametrage.config_matieres', 'label' => 'Config. matières/niveaux'],
                ['slug' => 'parametrage.series',          'label' => 'Séries'],
                ['slug' => 'parametrage.type_devoirs',    'label' => 'Types de devoirs'],
                ['slug' => 'parametrage.periodes',        'label' => 'Périodes'],
                ['slug' => 'parametrage.salles',          'label' => 'Salles'],
                ['slug' => 'parametrage.volume_horaire',  'label' => 'Volumes horaires'],
                ['slug' => 'parametrage.grille_horaire',  'label' => 'Grille horaire'],
                ['slug' => 'parametrage.archivage',       'label' => "Archivage fin d'année"],
            ]],
            ['slug' => 'statistiques', 'label' => 'Statistiques', 'enfants' => [
                ['slug' => 'statistiques.tableaux_bord',   'label' => 'Tableaux de bord'],
                ['slug' => 'statistiques.stats_generales', 'label' => 'Stats générales'],
            ]],
            // Pas d'entrée dédiée dans la sidebar (accès depuis la fiche élève) — gating backend uniquement.
            ['slug' => 'sante', 'label' => 'Santé élève', 'enfants' => []],
        ];

        foreach ($catalogue as $ordreParent => $parent) {
            $parentModule = Module::updateOrCreate(
                ['slug' => $parent['slug']],
                ['label' => $parent['label'], 'parent_id' => null, 'ordre' => $ordreParent, 'actif_par_defaut' => true]
            );

            foreach ($parent['enfants'] as $ordreEnfant => $enfant) {
                Module::updateOrCreate(
                    ['slug' => $enfant['slug']],
                    ['label' => $enfant['label'], 'parent_id' => $parentModule->id, 'ordre' => $ordreEnfant, 'actif_par_defaut' => true]
                );
            }
        }
    }
}
