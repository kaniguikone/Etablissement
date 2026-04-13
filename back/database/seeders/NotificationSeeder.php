<?php

namespace Database\Seeders;

use App\Models\Eleve;
use App\Models\Enseignant;
use App\Models\Notification;
use App\Models\Parents;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Crée des notifications de démonstration pour tous les types d'acteurs :
 *  - Parents   : absences, devoirs, bulletin disponible, paiement confirmé
 *  - Admin     : nouvelles inscriptions, informations générales
 *  - Enseignant: informations générales
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $parents     = Parents::inRandomOrder()->take(10)->get();
        $enseignants = Enseignant::inRandomOrder()->take(5)->get();
        $admin       = User::first();

        $total = 0;

        // ── Notifications pour les parents ────────────────────────────────────
        foreach ($parents as $parent) {
            $eleve = Eleve::where('parent_id', $parent->id)->first();
            if (!$eleve) continue;

            $notifs = [
                [
                    'type'  => 'absence',
                    'titre' => 'Absence signalée',
                    'corps' => "{$eleve->prenoms_eleve} {$eleve->nom_eleve} a été marqué(e) absent(e) ce matin.",
                    'data'  => ['eleve_id' => $eleve->id],
                    'lu_le' => null,
                ],
                [
                    'type'  => 'devoir',
                    'titre' => 'Nouveau devoir publié',
                    'corps' => "Un devoir de Mathématiques a été ajouté pour la classe de {$eleve->classe?->nom_classe}.",
                    'data'  => ['eleve_id' => $eleve->id],
                    'lu_le' => fake()->optional(0.6)->dateTimeBetween('-7 days', 'now'),
                ],
                [
                    'type'  => 'bulletin',
                    'titre' => 'Bulletin disponible',
                    'corps' => "Le bulletin du 1er Trimestre de {$eleve->prenoms_eleve} est disponible.",
                    'data'  => ['eleve_id' => $eleve->id, 'periode_id' => 1],
                    'lu_le' => fake()->optional(0.5)->dateTimeBetween('-30 days', '-1 day'),
                ],
                [
                    'type'  => 'paiement',
                    'titre' => 'Paiement enregistré',
                    'corps' => "Un paiement a été enregistré pour {$eleve->prenoms_eleve} {$eleve->nom_eleve}.",
                    'data'  => ['eleve_id' => $eleve->id],
                    'lu_le' => fake()->optional(0.7)->dateTimeBetween('-14 days', 'now'),
                ],
                [
                    'type'  => 'information',
                    'titre' => 'Réunion parents-profs',
                    'corps' => 'Une réunion parents-professeurs est organisée le 15/11/2024 à 16h.',
                    'data'  => [],
                    'lu_le' => null,
                ],
            ];

            // Choisir 2 à 4 notifs aléatoires
            shuffle($notifs);
            $choix = array_slice($notifs, 0, rand(2, 4));

            foreach ($choix as $n) {
                Notification::create([
                    'owner_type' => 'parent',
                    'owner_id'   => $parent->id,
                    'type'       => $n['type'],
                    'titre'      => $n['titre'],
                    'corps'      => $n['corps'],
                    'data'       => $n['data'],
                    'lu_le'      => $n['lu_le'],
                    'created_at' => fake()->dateTimeBetween('-60 days', 'now'),
                ]);
                $total++;
            }
        }

        // ── Notifications pour l'admin ────────────────────────────────────────
        if ($admin) {
            $notifAdmin = [
                [
                    'type'  => 'inscription',
                    'titre' => 'Nouvelle demande d\'inscription',
                    'corps' => 'Une nouvelle demande d\'inscription a été soumise pour Kouamé Jean en Sixième.',
                    'data'  => [],
                    'lu_le' => null,
                ],
                [
                    'type'  => 'inscription',
                    'titre' => 'Nouvelle demande d\'inscription',
                    'corps' => 'Une nouvelle demande d\'inscription a été soumise pour Diallo Aïssatou en Seconde.',
                    'data'  => [],
                    'lu_le' => now(),
                ],
                [
                    'type'  => 'information',
                    'titre' => 'Information publiée',
                    'corps' => 'L\'information « Vacances de Toussaint » a été publiée avec succès.',
                    'data'  => [],
                    'lu_le' => now(),
                ],
                [
                    'type'  => 'paiement',
                    'titre' => 'Paiement CinetPay reçu',
                    'corps' => 'Un paiement en ligne de 50 000 FCFA a été validé via CinetPay.',
                    'data'  => [],
                    'lu_le' => null,
                ],
            ];

            foreach ($notifAdmin as $n) {
                Notification::create([
                    'owner_type' => 'user',
                    'owner_id'   => $admin->id,
                    'type'       => $n['type'],
                    'titre'      => $n['titre'],
                    'corps'      => $n['corps'],
                    'data'       => $n['data'],
                    'lu_le'      => $n['lu_le'],
                    'created_at' => fake()->dateTimeBetween('-30 days', 'now'),
                ]);
                $total++;
            }
        }

        // ── Notifications pour les enseignants ────────────────────────────────
        foreach ($enseignants as $enseignant) {
            $notifEns = [
                [
                    'type'  => 'information',
                    'titre' => 'Nouvelle information de l\'établissement',
                    'corps' => 'Une nouvelle information a été publiée : « Réunion pédagogique du 20/11/2024 ».',
                    'data'  => [],
                    'lu_le' => fake()->optional(0.5)->dateTimeBetween('-10 days', 'now'),
                ],
                [
                    'type'  => 'devoir',
                    'titre' => 'Rappel : saisie des notes',
                    'corps' => 'Le délai de saisie des notes du 1er trimestre expire dans 3 jours.',
                    'data'  => [],
                    'lu_le' => null,
                ],
            ];

            foreach ($notifEns as $n) {
                Notification::create([
                    'owner_type' => 'enseignant',
                    'owner_id'   => $enseignant->id,
                    'type'       => $n['type'],
                    'titre'      => $n['titre'],
                    'corps'      => $n['corps'],
                    'data'       => $n['data'],
                    'lu_le'      => $n['lu_le'],
                    'created_at' => fake()->dateTimeBetween('-20 days', 'now'),
                ]);
                $total++;
            }
        }

        $this->command->info("✓ {$total} notifications créées.");
    }
}
