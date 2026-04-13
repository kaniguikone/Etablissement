<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Informations;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class InformationsController extends Controller
{
    public function index()
    {
        $informations = Informations::orderBy('date_info', 'desc')->paginate(15);

        return response()->json($informations);
    }

    public function store(Request $request)
    {
        $request->validate([
            'date_info' => 'required|date',
            'titre'     => 'required|string|max:255',
            'contenu'   => 'required|string',
        ]);

        $information = Informations::create($request->only(['date_info', 'titre', 'contenu']));

        // Notifier tous les parents de la nouvelle information
        app(NotificationService::class)->notifierTousParents(
            'information',
            'Nouvelle information',
            $request->titre,
            ['information_id' => $information->id]
        );

        return response()->json($information, 201);
    }

    public function show(string $id)
    {
        $information = Informations::findOrFail($id);

        return response()->json($information);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'date_info' => 'required|date',
            'titre'     => 'required|string|max:255',
            'contenu'   => 'required|string',
        ]);

        $information = Informations::findOrFail($id);
        $information->update($request->only(['date_info', 'titre', 'contenu']));

        return response()->json($information);
    }

    public function destroy(string $id)
    {
        $information = Informations::findOrFail($id);
        $information->delete();

        return response()->json(null, 204);
    }
}
