<?php

namespace App\Services;

use App\Models\FcmToken;
use App\Models\Notification;
use App\Models\Parents;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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

    // ── Enregistrement token FCM ──────────────────────────────────────────────

    public function enregistrerToken(string $ownerType, int $ownerId, string $token): void
    {
        FcmToken::enregistrer($ownerType, $ownerId, $token);
    }
}
