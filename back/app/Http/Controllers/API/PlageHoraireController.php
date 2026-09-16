<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmploiDuTemps;
use App\Models\PlageHoraire;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Grille horaire de l'établissement — chantier EDT, Lot 0.2.
 */
class PlageHoraireController extends Controller
{
    public function index()
    {
        $plages = PlageHoraire::orderBy('ordre')->orderBy('heure_debut')->get();

        return response()->json($plages);
    }

    public function store(Request $request)
    {
        $data = $this->valider($request);
        $this->verifierChevauchement($data);

        $plage = PlageHoraire::create($data);

        return response()->json($plage, 201);
    }

    public function update(Request $request, int $id)
    {
        $plage = PlageHoraire::findOrFail($id);
        $data = $this->valider($request);
        $this->verifierChevauchement($data, $id);

        $plage->update($data);

        return response()->json($plage);
    }

    public function destroy(int $id)
    {
        $plage = PlageHoraire::findOrFail($id);

        if (EmploiDuTemps::where('plage_horaire_id', $id)->exists()) {
            return response()->json([
                'message' => 'Cette plage est utilisée par des créneaux d\'emploi du temps. Retirez-les d\'abord.',
            ], 422);
        }

        $plage->delete();

        return response()->json(null, 204);
    }

    /**
     * Recopie les plages d'un jour vers un ou plusieurs autres jours.
     * Body : { source: 'lundi', cibles: ['mardi','jeudi'], remplacer: true }
     */
    public function dupliquerJour(Request $request)
    {
        $data = $request->validate([
            'source' => ['required', Rule::in(PlageHoraire::JOURS)],
            'cibles' => 'required|array|min:1',
            'cibles.*' => [Rule::in(PlageHoraire::JOURS)],
            'remplacer' => 'nullable|boolean',
        ]);

        $sources = PlageHoraire::where('jour', $data['source'])->orderBy('ordre')->get();
        if ($sources->isEmpty()) {
            return response()->json(['message' => "Aucune plage définie pour {$data['source']}."], 422);
        }

        $creees = 0;
        $ignorees = 0;
        foreach (array_unique($data['cibles']) as $cible) {
            if ($cible === $data['source']) {
                continue;
            }
            if ($request->boolean('remplacer')) {
                PlageHoraire::where('jour', $cible)->delete();
            }
            foreach ($sources as $s) {
                // Sans « remplacer », ne pas dupliquer par-dessus une plage déjà
                // là (ex. clic répété sur « Recopier ») : ça créait silencieusement
                // des doublons qui se chevauchent, jamais détectés ensuite.
                if ($this->chevaucheExistant(['jour' => $cible, 'heure_debut' => $s->heure_debut, 'heure_fin' => $s->heure_fin])) {
                    $ignorees++;

                    continue;
                }
                PlageHoraire::create([
                    'annee_scolaire_id' => $s->annee_scolaire_id,
                    'libelle' => $s->libelle,
                    'jour' => $cible,
                    'ordre' => $s->ordre,
                    'heure_debut' => $s->heure_debut,
                    'heure_fin' => $s->heure_fin,
                    'type' => $s->type,
                    'actif' => $s->actif,
                ]);
                $creees++;
            }
        }

        $message = "{$creees} plage(s) recopiée(s).";
        if ($ignorees > 0) {
            $message .= " {$ignorees} ignorée(s) (chevauchement avec une plage déjà existante).";
        }

        return response()->json(['message' => $message, 'creees' => $creees, 'ignorees' => $ignorees]);
    }

    /**
     * Construit un ou plusieurs jours d'un coup à partir d'une séquence de
     * blocs (cours / récréation / pause méridienne), au lieu de saisir
     * chaque plage une à une. Les heures sont calculées automatiquement à
     * partir de `heure_debut` ; les libellés suivent la convention MENET
     * (M1, M2… le matin, S1, S2… après la pause méridienne).
     *
     * Body : {
     *   jours: ['lundi','mardi'], heure_debut: '07:30', remplacer: false,
     *   blocs: [
     *     {type: 'cours', nb_plages: 4, duree_minutes: 55},
     *     {type: 'recreation', duree_minutes: 15},
     *     {type: 'cours', nb_plages: 2, duree_minutes: 55},
     *     {type: 'pause_midi', duree_minutes: 80},
     *     {type: 'cours', nb_plages: 2, duree_minutes: 55},
     *   ],
     * }
     */
    public function construire(Request $request)
    {
        $data = $request->validate([
            'jours' => 'required|array|min:1',
            'jours.*' => [Rule::in(PlageHoraire::JOURS)],
            'heure_debut' => 'required|date_format:H:i',
            'remplacer' => 'nullable|boolean',
            'blocs' => 'required|array|min:1',
            'blocs.*.type' => ['required', Rule::in(PlageHoraire::TYPES)],
            'blocs.*.duree_minutes' => 'required|integer|min:1|max:300',
            'blocs.*.nb_plages' => 'required_if:blocs.*.type,cours|nullable|integer|min:1|max:20',
        ]);

        $creees = 0;
        $ignorees = 0;

        foreach (array_unique($data['jours']) as $jour) {
            if ($request->boolean('remplacer')) {
                PlageHoraire::where('jour', $jour)->delete();
            }

            $curseur = $data['heure_debut'];
            $ordre = 1;
            $compteurM = 0;
            $compteurS = 0;
            $compteurRecre = 0;
            $apresMidi = false;

            foreach ($data['blocs'] as $bloc) {
                if ($bloc['type'] === 'cours') {
                    for ($i = 0; $i < $bloc['nb_plages']; $i++) {
                        $fin = Carbon::createFromFormat('H:i', $curseur)->addMinutes($bloc['duree_minutes'])->format('H:i');
                        $libelle = $apresMidi ? 'S'.(++$compteurS) : 'M'.(++$compteurM);
                        [$c, $ig] = $this->creerSiLibre($jour, $ordre++, $libelle, $curseur, $fin, 'cours');
                        $creees += $c;
                        $ignorees += $ig;
                        $curseur = $fin;
                    }

                    continue;
                }

                $fin = Carbon::createFromFormat('H:i', $curseur)->addMinutes($bloc['duree_minutes'])->format('H:i');
                if ($bloc['type'] === 'pause_midi') {
                    $libelle = 'Pause méridienne';
                    $apresMidi = true;
                } else {
                    $compteurRecre++;
                    $libelle = $compteurRecre > 1 ? "Récréation {$compteurRecre}" : 'Récréation';
                }
                [$c, $ig] = $this->creerSiLibre($jour, $ordre++, $libelle, $curseur, $fin, $bloc['type']);
                $creees += $c;
                $ignorees += $ig;
                $curseur = $fin;
            }
        }

        $message = "{$creees} plage(s) créée(s).";
        if ($ignorees > 0) {
            $message .= " {$ignorees} ignorée(s) (chevauchement avec une plage déjà existante).";
        }

        return response()->json(['message' => $message, 'creees' => $creees, 'ignorees' => $ignorees]);
    }

    /** Crée la plage si elle ne chevauche rien d'existant ; sinon l'ignore. @return array{0:int,1:int} [créée, ignorée] (0 ou 1 chacun) */
    private function creerSiLibre(string $jour, int $ordre, string $libelle, string $debut, string $fin, string $type): array
    {
        if ($this->chevaucheExistant(['jour' => $jour, 'heure_debut' => $debut, 'heure_fin' => $fin])) {
            return [0, 1];
        }
        PlageHoraire::create([
            'libelle' => $libelle, 'jour' => $jour, 'ordre' => $ordre,
            'heure_debut' => $debut, 'heure_fin' => $fin, 'type' => $type,
        ]);

        return [1, 0];
    }

    /**
     * Vide un jour (ou toute la grille si `jour` est omis). Les plages déjà
     * utilisées par un créneau d'emploi du temps sont conservées (même
     * protection que la suppression unitaire) — le détail est renvoyé pour
     * que l'utilisateur sache lesquelles retirer les créneaux d'abord.
     *
     * Les plages « tous les jours » (jour = null) ne sont retirées que lors
     * d'un vidage complet, pas d'un vidage limité à un seul jour.
     */
    public function vider(Request $request)
    {
        $data = $request->validate([
            'jour' => ['nullable', Rule::in(PlageHoraire::JOURS)],
        ]);

        $plages = empty($data['jour'])
            ? PlageHoraire::all()
            : PlageHoraire::where('jour', $data['jour'])->get();

        $supprimees = 0;
        $protegees = [];
        foreach ($plages as $p) {
            if (EmploiDuTemps::where('plage_horaire_id', $p->id)->exists()) {
                $protegees[] = $p->libelle.' ('.($p->jour ?? 'tous les jours').')';

                continue;
            }
            $p->delete();
            $supprimees++;
        }

        return response()->json(['supprimees' => $supprimees, 'protegees' => $protegees]);
    }

    private function valider(Request $request): array
    {
        return $request->validate([
            'annee_scolaire_id' => 'nullable|exists:annees_scolaires,id',
            'libelle' => 'required|string|max:50',
            'jour' => ['nullable', Rule::in(PlageHoraire::JOURS)],
            'ordre' => 'nullable|integer|min:0|max:50',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => ['required', 'date_format:H:i', function ($attr, $val, $fail) use ($request) {
                if ($val <= $request->heure_debut) {
                    $fail("L'heure de fin doit être après l'heure de début.");
                }
            }],
            'type' => ['nullable', Rule::in(PlageHoraire::TYPES)],
            'actif' => 'nullable|boolean',
        ]);
    }

    /**
     * Deux plages du même jour ne peuvent pas se chevaucher (en tenant compte
     * des plages « tous les jours » — jour = null).
     */
    private function verifierChevauchement(array $data, ?int $exclureId = null): void
    {
        if ($this->chevaucheExistant($data, $exclureId)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Cette plage en chevauche une autre sur le même créneau.',
            ], 422));
        }
    }

    private function chevaucheExistant(array $data, ?int $exclureId = null): bool
    {
        $jour = $data['jour'] ?? null;

        $query = PlageHoraire::where('heure_debut', '<', $data['heure_fin'])
            ->where('heure_fin', '>', $data['heure_debut']);

        if ($jour !== null) {
            $query->where(fn ($q) => $q->where('jour', $jour)->orWhereNull('jour'));
        }
        // une plage « tous les jours » (jour = null) entre en conflit avec n'importe quelle plage

        if ($exclureId) {
            $query->where('id', '!=', $exclureId);
        }

        return $query->exists();
    }
}
