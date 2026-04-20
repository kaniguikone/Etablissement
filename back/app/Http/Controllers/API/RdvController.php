<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CreneauRdv;
use App\Models\ReservationRdv;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class RdvController extends Controller
{
    private function avecCreneau()
    {
        return ['creneau.enseignant', 'parent', 'eleve'];
    }

    // ── Enseignant ────────────────────────────────────────────────────────────

    public function mesCreneaux(Request $request)
    {
        $enseignant = $request->user();
        $creneaux = CreneauRdv::with('reservation.eleve', 'reservation.parent')
            ->where('enseignant_id', $enseignant->id)
            ->where('date_creneau', '>=', now()->toDateString())
            ->orderBy('date_creneau')->orderBy('heure_debut')
            ->get()
            ->map(fn($c) => array_merge($c->toArray(), [
                'reserve' => $c->reservation !== null,
            ]));

        return response()->json($creneaux);
    }

    public function creerCreneau(Request $request)
    {
        $enseignantId = $request->user()->id;

        $request->validate([
            'date_creneau' => 'required|date|after_or_equal:today',
            'heure_debut'  => 'required|date_format:H:i,H:i:s',
            'heure_fin'    => ['required', 'date_format:H:i,H:i:s', function ($attr, $val, $fail) use ($request) {
                if (substr($val, 0, 5) <= substr($request->heure_debut, 0, 5))
                    $fail("L'heure de fin doit être après l'heure de début.");
            }],
        ]);

        $creneau = CreneauRdv::create([
            'enseignant_id' => $enseignantId,
            'date_creneau'  => $request->date_creneau,
            'heure_debut'   => $request->heure_debut,
            'heure_fin'     => $request->heure_fin,
            'actif'         => true,
        ]);

        return response()->json($creneau, 201);
    }

    public function supprimerCreneau(Request $request, int $id)
    {
        $creneau = CreneauRdv::where('enseignant_id', $request->user()->id)->findOrFail($id);

        if ($creneau->reservation && $creneau->reservation->statut !== 'annule') {
            return response()->json(['message' => 'Ce créneau a une réservation active. Annulez-la d\'abord.'], 422);
        }

        $creneau->delete();
        return response()->json(null, 204);
    }

    public function mesReservations(Request $request)
    {
        $enseignant = $request->user();

        $reservations = ReservationRdv::with($this->avecCreneau())
            ->whereHas('creneau', fn($q) => $q->where('enseignant_id', $enseignant->id))
            ->orderByDesc('created_at')
            ->get();

        return response()->json($reservations);
    }

    public function confirmer(Request $request, int $id)
    {
        $reservation = ReservationRdv::with($this->avecCreneau())
            ->whereHas('creneau', fn($q) => $q->where('enseignant_id', $request->user()->id))
            ->findOrFail($id);

        $request->validate(['note_enseignant' => 'nullable|string|max:500']);

        $reservation->update([
            'statut'           => 'confirme',
            'note_enseignant'  => $request->note_enseignant,
        ]);

        $this->notifierParent($reservation, 'confirme');

        return response()->json($reservation->fresh($this->avecCreneau()));
    }

    public function annulerEnseignant(Request $request, int $id)
    {
        $reservation = ReservationRdv::with($this->avecCreneau())
            ->whereHas('creneau', fn($q) => $q->where('enseignant_id', $request->user()->id))
            ->findOrFail($id);

        $reservation->update(['statut' => 'annule']);
        $this->notifierParent($reservation, 'annule');

        return response()->json($reservation->fresh($this->avecCreneau()));
    }

    // ── Parent ────────────────────────────────────────────────────────────────

    public function creneauxEnseignant(Request $request, int $enseignantId)
    {
        $creneaux = CreneauRdv::with('reservation:id,creneau_id,statut')
            ->where('enseignant_id', $enseignantId)
            ->where('actif', true)
            ->where('date_creneau', '>=', now()->toDateString())
            ->orderBy('date_creneau')->orderBy('heure_debut')
            ->get()
            ->map(fn($c) => [
                'id'          => $c->id,
                'date_creneau'=> $c->date_creneau->format('Y-m-d'),
                'heure_debut' => $c->heure_debut,
                'heure_fin'   => $c->heure_fin,
                'reserve'     => $c->reservation && $c->reservation->statut !== 'annule',
            ]);

        return response()->json($creneaux);
    }

    public function reserver(Request $request)
    {
        $parent = $request->user();

        $request->validate([
            'creneau_id' => 'required|exists:creneaux_rdv,id',
            'eleve_id'   => 'required|exists:eleves,id',
            'motif'      => 'nullable|string|max:500',
        ]);

        // Vérifier disponibilité
        $creneau = CreneauRdv::findOrFail($request->creneau_id);

        if (!$creneau->actif) {
            return response()->json(['message' => 'Ce créneau n\'est plus disponible.'], 422);
        }
        if ($creneau->date_creneau->isPast()) {
            return response()->json(['message' => 'Ce créneau est déjà passé.'], 422);
        }

        $existe = ReservationRdv::where('creneau_id', $request->creneau_id)
            ->where('statut', '!=', 'annule')
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Ce créneau est déjà réservé.'], 422);
        }

        $reservation = ReservationRdv::create([
            'creneau_id' => $request->creneau_id,
            'parent_id'  => $parent->id,
            'eleve_id'   => $request->eleve_id,
            'statut'     => 'en_attente',
            'motif'      => $request->motif,
        ]);

        $this->notifierEnseignant($reservation->load($this->avecCreneau()));

        return response()->json($reservation->load($this->avecCreneau()), 201);
    }

    public function mesReservationsParent(Request $request)
    {
        $parent = $request->user();

        $reservations = ReservationRdv::with($this->avecCreneau())
            ->where('parent_id', $parent->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($reservations);
    }

    public function annulerParent(Request $request, int $id)
    {
        $reservation = ReservationRdv::with($this->avecCreneau())
            ->where('parent_id', $request->user()->id)
            ->findOrFail($id);

        if ($reservation->creneau->date_creneau->isPast()) {
            return response()->json(['message' => 'Impossible d\'annuler un RDV passé.'], 422);
        }

        $reservation->update(['statut' => 'annule']);
        $this->notifierEnseignant($reservation, 'annule');

        return response()->json($reservation->fresh($this->avecCreneau()));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public function toutesReservations()
    {
        return response()->json(
            ReservationRdv::with($this->avecCreneau())->orderByDesc('created_at')->get()
        );
    }

    public function tousCreneaux()
    {
        return response()->json(
            CreneauRdv::with(['enseignant', 'reservation.parent', 'reservation.eleve'])
                ->orderBy('date_creneau')->orderBy('heure_debut')->get()
        );
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    private function notifierEnseignant(ReservationRdv $r, string $statut = 'en_attente'): void
    {
        try {
            $titre   = 'Nouvelle demande de RDV';
            $message = sprintf(
                '%s souhaite un RDV le %s de %s à %s (élève : %s).',
                $r->parent?->nom_parent . ' ' . $r->parent?->prenoms_parent,
                $r->creneau?->date_creneau?->format('d/m/Y'),
                substr($r->creneau?->heure_debut ?? '', 0, 5),
                substr($r->creneau?->heure_fin ?? '', 0, 5),
                $r->eleve?->nom_eleve . ' ' . $r->eleve?->prenoms_eleve
            );
            app(NotificationService::class)->notifierEnseignant(
                $r->creneau->enseignant_id, 'rdv', $titre, $message,
                ['reservation_id' => $r->id]
            );
        } catch (\Throwable) {}
    }

    private function notifierParent(ReservationRdv $r, string $statut): void
    {
        try {
            $labels  = ['confirme' => 'confirmé', 'annule' => 'annulé'];
            $titre   = 'RDV ' . ($labels[$statut] ?? $statut);
            $message = sprintf(
                'Votre RDV du %s de %s à %s a été %s.',
                $r->creneau?->date_creneau?->format('d/m/Y'),
                substr($r->creneau?->heure_debut ?? '', 0, 5),
                substr($r->creneau?->heure_fin ?? '', 0, 5),
                $labels[$statut] ?? $statut
            );
            app(NotificationService::class)->notifierParent(
                $r->parent_id, 'rdv', $titre, $message,
                ['reservation_id' => $r->id]
            );
        } catch (\Throwable) {}
    }
}
