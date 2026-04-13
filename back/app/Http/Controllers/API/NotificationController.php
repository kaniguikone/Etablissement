<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FcmToken;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $service) {}

    // ── Résoudre le owner depuis le user connecté ─────────────────────────────

    /** Retourne ['type' => 'parent'|'user'|'enseignant', 'id' => int] */
    private function owner(Request $request): array
    {
        $user = $request->user();
        // L'authentification mobile enseignant et parent utilise leurs propres modèles
        return match (true) {
            $user instanceof \App\Models\Parents     => ['type' => 'parent',     'id' => $user->id],
            $user instanceof \App\Models\Enseignant  => ['type' => 'enseignant', 'id' => $user->id],
            default                                  => ['type' => 'user',       'id' => $user->id],
        };
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    /**
     * Liste des notifications (paginées).
     */
    public function index(Request $request)
    {
        $o = $this->owner($request);

        $notifications = Notification::pour($o['type'], $o['id'])
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return response()->json($notifications);
    }

    /**
     * Nombre de notifications non lues (pour le badge).
     */
    public function nonLues(Request $request)
    {
        $o = $this->owner($request);

        $count = Notification::pour($o['type'], $o['id'])->nonLues()->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Marquer une notification comme lue.
     */
    public function lire(Request $request, int $id)
    {
        $o    = $this->owner($request);
        $notif = Notification::pour($o['type'], $o['id'])->findOrFail($id);

        if (!$notif->lu_le) {
            $notif->update(['lu_le' => now()]);
        }

        return response()->json($notif);
    }

    /**
     * Marquer toutes les notifications comme lues.
     */
    public function lireTout(Request $request)
    {
        $o = $this->owner($request);

        Notification::pour($o['type'], $o['id'])
            ->nonLues()
            ->update(['lu_le' => now()]);

        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }

    /**
     * Supprimer une notification.
     */
    public function destroy(Request $request, int $id)
    {
        $o    = $this->owner($request);
        $notif = Notification::pour($o['type'], $o['id'])->findOrFail($id);
        $notif->delete();

        return response()->json(null, 204);
    }

    /**
     * Enregistrer / mettre à jour le token FCM de l'utilisateur connecté.
     * POST /fcm-token  (ou /parent/fcm-token, /enseignant/fcm-token)
     */
    public function enregistrerToken(Request $request)
    {
        $request->validate(['token' => 'required|string']);
        $o = $this->owner($request);

        $this->service->enregistrerToken($o['type'], $o['id'], $request->token);

        return response()->json(['message' => 'Token FCM enregistré.']);
    }
}
