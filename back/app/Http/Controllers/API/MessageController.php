<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Enseignant;
use App\Models\Parents;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Conversations de l'utilisateur connecté (portail mobile).
     * Retourne la dernière ligne par paire (expediteur, destinataire, eleve).
     */
    public function conversations(Request $request)
    {
        [$type, $id] = $this->typeEtId($request);

        // Dernier message par conversation (limité aux 200 derniers pour performance)
        $messages = Message::with('eleve:id,nom_eleve,prenoms_eleve')
            ->where(function ($q) use ($type, $id) {
                $q->where(fn($q2) => $q2->where('expediteur_type', $type)->where('expediteur_id', $id))
                  ->orWhere(fn($q2) => $q2->where('destinataire_type', $type)->where('destinataire_id', $id));
            })
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        // Grouper par clé de conversation (1 seule passe)
        $conversations = [];
        foreach ($messages as $msg) {
            [$autreType, $autreId] = $msg->expediteur_type === $type && $msg->expediteur_id === $id
                ? [$msg->destinataire_type, $msg->destinataire_id]
                : [$msg->expediteur_type, $msg->expediteur_id];

            $cle = "{$autreType}:{$autreId}:" . ($msg->eleve_id ?? 0);

            if (!isset($conversations[$cle])) {
                $conversations[$cle] = [
                    'autre_type'  => $autreType,
                    'autre_id'    => $autreId,
                    'autre_nom'   => null, // résolu après en batch
                    'eleve_id'    => $msg->eleve_id,
                    'eleve_nom'   => $msg->eleve ? trim($msg->eleve->nom_eleve . ' ' . $msg->eleve->prenoms_eleve) : null,
                    'dernier_msg' => $msg->contenu,
                    'dernier_at'  => $msg->created_at,
                    'non_lus'     => 0,
                ];
            }
        }

        // Résoudre les noms des interlocuteurs en 2 requêtes max
        $enseignantIds = collect($conversations)->where('autre_type', 'enseignant')->pluck('autre_id')->unique();
        $parentIds     = collect($conversations)->where('autre_type', 'parent')->pluck('autre_id')->unique();

        $enseignants = $enseignantIds->isNotEmpty()
            ? Enseignant::whereIn('id', $enseignantIds)->select('id', 'nom_enseignant', 'prenoms_enseignant')->get()->keyBy('id')
            : collect();
        $parents = $parentIds->isNotEmpty()
            ? Parents::whereIn('id', $parentIds)->select('id', 'nom_parent', 'prenom_parent')->get()->keyBy('id')
            : collect();

        // Compter les non-lus en une seule requête groupée
        $nonLusRaw = Message::nonLus($type, $id)
            ->selectRaw('expediteur_type, expediteur_id, COALESCE(eleve_id, 0) as eleve_id_key, count(*) as cnt')
            ->groupBy('expediteur_type', 'expediteur_id', DB::raw('COALESCE(eleve_id, 0)'))
            ->get();
        $nonLusMap = [];
        foreach ($nonLusRaw as $row) {
            $nonLusMap["{$row->expediteur_type}:{$row->expediteur_id}:{$row->eleve_id_key}"] = $row->cnt;
        }

        foreach ($conversations as $cle => &$conv) {
            if ($conv['autre_type'] === 'enseignant') {
                $e = $enseignants[$conv['autre_id']] ?? null;
                $conv['autre_nom'] = $e ? trim("{$e->nom_enseignant} {$e->prenoms_enseignant}") : '—';
            } else {
                $p = $parents[$conv['autre_id']] ?? null;
                $conv['autre_nom'] = $p ? trim("{$p->nom_parent} {$p->prenom_parent}") : '—';
            }
            $conv['non_lus'] = $nonLusMap["{$conv['autre_type']}:{$conv['autre_id']}:" . ($conv['eleve_id'] ?? 0)] ?? 0;
        }
        unset($conv);

        return response()->json(array_values($conversations));
    }

    /**
     * Fil de discussion avec un interlocuteur pour un élève (portail mobile).
     */
    public function fil(Request $request, int $eleveId)
    {
        [$monType, $monId] = $this->typeEtId($request);
        $autreType = $request->query('autre_type');
        $autreId   = (int) $request->query('autre_id');

        $messages = Message::conversation($monType, $monId, $autreType, $autreId, $eleveId)
            ->orderBy('created_at')
            ->get();

        // Marquer les messages reçus comme lus
        Message::conversation($monType, $monId, $autreType, $autreId, $eleveId)
            ->where('destinataire_type', $monType)
            ->where('destinataire_id', $monId)
            ->whereNull('lu_at')
            ->update(['lu_at' => now()]);

        return response()->json($messages);
    }

    /**
     * Envoyer un message (portail mobile).
     */
    public function store(Request $request)
    {
        [$monType, $monId] = $this->typeEtId($request);

        $request->validate([
            'destinataire_type' => 'required|in:parent,enseignant',
            'destinataire_id'   => 'required|integer',
            'eleve_id'          => 'nullable|exists:eleves,id',
            'contenu'           => 'required|string|max:2000',
        ]);

        $msg = Message::create([
            'expediteur_type'   => $monType,
            'expediteur_id'     => $monId,
            'destinataire_type' => $request->destinataire_type,
            'destinataire_id'   => $request->destinataire_id,
            'eleve_id'          => $request->eleve_id,
            'contenu'           => $request->contenu,
        ]);

        // Notification au destinataire
        $this->notifier($msg);

        return response()->json($msg->load('eleve'), 201);
    }

    /**
     * Marquer tous les messages d'une conversation comme lus.
     */
    public function lireTout(Request $request)
    {
        [$type, $id] = $this->typeEtId($request);

        $request->validate([
            'expediteur_type' => 'required|in:parent,enseignant',
            'expediteur_id'   => 'required|integer',
            'eleve_id'        => 'nullable|integer',
        ]);

        Message::nonLus($type, $id)
            ->where('expediteur_type', $request->expediteur_type)
            ->where('expediteur_id', $request->expediteur_id)
            ->when($request->eleve_id, fn($q) => $q->where('eleve_id', $request->eleve_id))
            ->update(['lu_at' => now()]);

        return response()->json(['message' => 'Messages marqués comme lus.']);
    }

    /**
     * Vue admin : liste toutes les conversations (résumé).
     */
    public function indexAdmin()
    {
        $derniers = Message::with('eleve')
            ->orderByDesc('created_at')
            ->get()
            ->unique(fn($m) => min("{$m->expediteur_type}:{$m->expediteur_id}", "{$m->destinataire_type}:{$m->destinataire_id}")
                             . ':' . ($m->eleve_id ?? 0))
            ->values();

        return response()->json($derniers);
    }

    /**
     * Vue admin : fil d'une conversation entre deux participants.
     */
    public function filAdmin(Request $request, string $a, string $b)
    {
        [$typeA, $idA] = explode(':', $a);
        [$typeB, $idB] = explode(':', $b);
        $eleveId = $request->query('eleve_id');

        $messages = Message::conversation($typeA, (int)$idA, $typeB, (int)$idB, $eleveId ? (int)$eleveId : null)
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    private function typeEtId(Request $request): array
    {
        $user = $request->user();
        if ($user instanceof Enseignant) return ['enseignant', $user->id];
        if ($user instanceof Parents)    return ['parent',     $user->id];
        // Back-office : admin ne fait que lire
        return ['admin', $user->id];
    }

    private function notifier(Message $msg): void
    {
        try {
            $ns = app(NotificationService::class);
            $preview = mb_strlen($msg->contenu) > 60
                ? mb_substr($msg->contenu, 0, 60) . '…'
                : $msg->contenu;

            if ($msg->destinataire_type === 'enseignant') {
                $ns->notifierEnseignant($msg->destinataire_id, 'message', 'Nouveau message', $preview, [
                    'message_id' => $msg->id, 'eleve_id' => $msg->eleve_id,
                ]);
            } elseif ($msg->destinataire_type === 'parent') {
                $ns->notifierParent($msg->destinataire_id, 'message', 'Nouveau message', $preview, [
                    'message_id' => $msg->id, 'eleve_id' => $msg->eleve_id,
                ]);
            }
        } catch (\Throwable) {}
    }
}
