<?php

namespace App\Services;

use App\Mail\NotificationParent;
use App\Models\Eleve;
use App\Models\FcmToken;
use App\Models\Notification;
use App\Models\Paiement;
use App\Models\Parents;
use App\Models\Scolarites;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    // ── Création en base ─────────────────────────────────────────────────────

    public function creerPour(
        string $ownerType,
        int    $ownerId,
        string $type,
        string $titre,
        string $corps,
        array  $data = []
    ): Notification {
        $notif = Notification::create([
            'owner_type' => $ownerType,
            'owner_id'   => $ownerId,
            'type'       => $type,
            'titre'      => $titre,
            'corps'      => $corps,
            'data'       => $data ?: null,
        ]);

        // Tentative d'envoi push (silencieuse si Firebase non configuré)
        $this->envoyerPush($ownerType, $ownerId, $titre, $corps, $data);

        return $notif;
    }

    public function notifierParent(int $parentId, string $type, string $titre, string $corps, array $data = []): void
    {
        $this->creerPour('parent', $parentId, $type, $titre, $corps, $data);
    }

    public function notifierUser(int $userId, string $type, string $titre, string $corps, array $data = []): void
    {
        $this->creerPour('user', $userId, $type, $titre, $corps, $data);
    }

    public function notifierEnseignant(int $enseignantId, string $type, string $titre, string $corps, array $data = []): void
    {
        $this->creerPour('enseignant', $enseignantId, $type, $titre, $corps, $data);
    }

    /** Notifie tous les parents qui ont un token FCM enregistré (ou toutes les entrées en base). */
    public function notifierTousParents(string $type, string $titre, string $corps, array $data = []): void
    {
        Parents::pluck('id')->each(function (int $parentId) use ($type, $titre, $corps, $data) {
            $this->notifierParent($parentId, $type, $titre, $corps, $data);
        });
    }

    // ── FCM Push ─────────────────────────────────────────────────────────────

    public function envoyerPush(string $ownerType, int $ownerId, string $titre, string $corps, array $data = []): void
    {
        $serverKey = config('services.fcm.server_key');
        if (!$serverKey) {
            return; // FCM non configuré → on passe silencieusement
        }

        $token = FcmToken::pour($ownerType, $ownerId);
        if (!$token) {
            return;
        }

        $this->envoyerPushToken($token, $titre, $corps, $data);
    }

    public function envoyerPushToken(string $token, string $titre, string $corps, array $data = []): void
    {
        $serverKey = config('services.fcm.server_key');
        if (!$serverKey) {
            return;
        }

        try {
            Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type'  => 'application/json',
            ])->post('https://fcm.googleapis.com/fcm/send', [
                'to'           => $token,
                'notification' => [
                    'title' => $titre,
                    'body'  => $corps,
                    'sound' => 'default',
                ],
                'data' => $data,
            ]);
        } catch (\Throwable $e) {
            Log::warning('FCM push échoué : ' . $e->getMessage());
        }
    }

    // ── Email parent ─────────────────────────────────────────────────────────

    /**
     * Envoie un email au parent d'un élève pour un événement scolaire.
     * Silencieux si le parent n'a pas d'email ou si le mailer n'est pas configuré.
     *
     * @param int    $parentId
     * @param int    $eleveId   Pour récupérer le nom de l'élève dans le mail
     * @param string $sujet     Objet de l'email
     * @param string $titre     Titre de la notification (header du mail)
     * @param string $corps     Corps du message
     * @param string $couleur   Couleur du header (#hex)
     */
    public function envoyerEmailParent(
        int    $parentId,
        int    $eleveId,
        string $sujet,
        string $titre,
        string $corps,
        string $couleur = '#1a56a0'
    ): void {
        try {
            $parent = Parents::find($parentId);
            if (!$parent || empty($parent->email_parent)) {
                return;
            }

            $eleve    = Eleve::find($eleveId);
            $nomEleve = $eleve
                ? strtoupper($eleve->nom_eleve) . ' ' . $eleve->prenoms_eleve
                : 'votre enfant';

            Mail::to($parent->email_parent)->send(new NotificationParent(
                nomParent:   trim($parent->prenom_parent . ' ' . $parent->nom_parent),
                nomEleve:    $nomEleve,
                sujet:       $sujet,
                titreNotif:  $titre,
                corpsNotif:  $corps,
                couleur:     $couleur,
            ));
        } catch (\Throwable $e) {
            Log::warning('Email parent échoué : ' . $e->getMessage());
        }
    }

    // ── Relances paiements en retard ─────────────────────────────────────────

    /**
     * Envoie des relances email+notif aux parents des élèves avec paiements en retard.
     * Utilisé par la commande Artisan et par le déclencheur manuel (API).
     *
     * @return array{envoyes: int, ignores: int}
     */
    public function relancerPaiementsEnRetard(): array
    {
        $today           = now()->toDateString();
        $echeancesEchues = Scolarites::where('date_echeance', '<', $today)->get();
        $envoyes         = 0;
        $ignores         = 0;

        foreach ($echeancesEchues as $echeance) {
            $eleves = Eleve::with(['parents', 'classe'])
                ->whereHas('classe', fn($q) => $q->where('niveau_id', $echeance->niveau_id))
                ->get();

            foreach ($eleves as $eleve) {
                $totalPaye = Paiement::where('eleve_id', $eleve->id)
                    ->where('scolarite_id', $echeance->id)
                    ->sum('montant_paye');

                $solde = (float) $echeance->montant_echeance - (float) $totalPaye;

                if ($solde <= 0) {
                    continue;
                }

                if ($eleve->parents->isEmpty()) {
                    $ignores++;
                    continue;
                }

                $montantFormate = number_format($solde, 0, ',', ' ');
                $corps = "La scolarité « {$echeance->libelle_echeance} » de {$eleve->prenoms_eleve} {$eleve->nom_eleve} "
                       . "est en retard. Solde restant : {$montantFormate} FCFA. "
                       . "Merci de régulariser au plus tôt auprès de l'administration.";

                foreach ($eleve->parents as $parent) {
                    $this->notifierParent(
                        $parent->id,
                        'paiement',
                        'Rappel de paiement',
                        $corps,
                        ['eleve_id' => $eleve->id, 'scolarite_id' => $echeance->id, 'solde' => $solde]
                    );

                    $this->envoyerEmailParent(
                        $parent->id,
                        $eleve->id,
                        "Rappel : paiement en retard — {$echeance->libelle_echeance}",
                        'Rappel de paiement',
                        $corps,
                        '#e67e22'
                    );
                }

                $envoyes++;
            }
        }

        Log::info("RelancesPaiements : {$envoyes} envoyées, {$ignores} ignorées (pas d'email).");

        return ['envoyes' => $envoyes, 'ignores' => $ignores];
    }

    // ── Enregistrement token FCM ──────────────────────────────────────────────

    public function enregistrerToken(string $ownerType, int $ownerId, string $token): void
    {
        FcmToken::enregistrer($ownerType, $ownerId, $token);
    }
}
