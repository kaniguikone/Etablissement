<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class TelechargerController extends Controller
{
    public function page(): Response
    {
        $tenant = tenant();

        // Logo de l'établissement (s'il existe dans sa DB)
        $logo = null;
        try {
            $etablissement = \App\Models\Etablissement::first();
            $logo = $etablissement?->logo
                ? asset('storage/' . $etablissement->logo)
                : null;
        } catch (\Throwable) {
            // Établissement non encore configuré
        }

        $apkDisponible = Storage::disk('apk')->exists($tenant->id . '.apk');

        return response()->view('telecharger', [
            'nom'           => $tenant->nom,
            'logo'          => $logo,
            'apkDisponible' => $apkDisponible,
        ]);
    }

    public function downloadApk(): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response
    {
        $tenant  = tenant();
        $fichier = $tenant->id . '.apk';

        if (!Storage::disk('apk')->exists($fichier)) {
            abort(404, 'APK non disponible.');
        }

        $nomTelecharge = \Illuminate\Support\Str::slug($tenant->nom) . '.apk';

        return Storage::disk('apk')->download($fichier, $nomTelecharge, [
            'Content-Type' => 'application/vnd.android.package-archive',
        ]);
    }
}
