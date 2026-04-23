<?php

declare(strict_types=1);

namespace App\Http\Controllers\API\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantController extends Controller
{
    public function index(): JsonResponse
    {
        $tenants = Tenant::with('domains')->orderBy('nom')->get();
        return response()->json($tenants);
    }

    /** Recherche publique — retourne uniquement nom + domaine des tenants actifs. */
    public function recherche(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));

        $tenants = Tenant::with('domains')
            ->where('actif', true)
            ->when($q !== '', fn($query) => $query->where('nom', 'like', "%{$q}%"))
            ->orderBy('nom')
            ->limit(10)
            ->get()
            ->map(fn($t) => [
                'nom'     => $t->nom,
                'domaine' => $t->domains->first()?->domain ?? '',
            ])
            ->filter(fn($t) => $t['domaine'] !== '')
            ->values();

        return response()->json($tenants);
    }

    /** Lookup public par code court — retourne nom + domaine. */
    public function lookupParCode(string $code): JsonResponse
    {
        $tenant = Tenant::with('domains')
            ->where('code', strtoupper(trim($code)))
            ->where('actif', true)
            ->first();

        if (! $tenant) {
            return response()->json(['message' => 'Code établissement introuvable.'], 404);
        }

        $domaine = $tenant->domains->first()?->domain ?? '';
        if ($domaine === '') {
            return response()->json(['message' => 'Établissement non configuré.'], 404);
        }

        return response()->json([
            'nom'     => $tenant->nom,
            'domaine' => $domaine,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id'              => 'required|string|max:63|unique:tenants,id|regex:/^[a-z0-9-]+$/',
            'nom'             => 'required|string|max:255',
            'email_contact'   => 'nullable|email|max:255',
            'telephone'       => 'nullable|string|max:30',
            'ville'           => 'nullable|string|max:100',
            'pays'            => 'nullable|string|max:100',
            'plan'            => ['nullable', Rule::in(['demo', 'basic', 'pro'])],
            'date_expiration' => 'nullable|date|after:today',
            'domaine'         => 'required|string|max:255', // sous-domaine principal
        ]);

        $tenant = new Tenant();
        $tenant->id             = $data['id'];
        $tenant->code           = $this->generateUniqueCode();
        $tenant->nom            = $data['nom'];
        $tenant->email_contact  = $data['email_contact'] ?? null;
        $tenant->telephone      = $data['telephone'] ?? null;
        $tenant->ville          = $data['ville'] ?? null;
        $tenant->pays           = $data['pays'] ?? "Côte d'Ivoire";
        $tenant->plan           = $data['plan'] ?? 'demo';
        $tenant->actif          = true;
        $tenant->date_expiration = $data['date_expiration'] ?? null;
        $tenant->save();

        // Créer le domaine associé (ex: lycee-moderne.monapp.ci)
        $tenant->domains()->create(['domain' => $data['domaine']]);

        return response()->json($tenant->load('domains'), 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenant = Tenant::with('domains')->findOrFail($id);
        return response()->json($tenant);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $data = $request->validate([
            'nom'             => 'sometimes|string|max:255',
            'email_contact'   => 'nullable|email|max:255',
            'telephone'       => 'nullable|string|max:30',
            'ville'           => 'nullable|string|max:100',
            'pays'            => 'nullable|string|max:100',
            'plan'            => ['nullable', Rule::in(['demo', 'basic', 'pro'])],
            'actif'           => 'sometimes|boolean',
            'date_expiration' => 'nullable|date',
        ]);

        $tenant->update($data);

        return response()->json($tenant->load('domains'));
    }

    public function destroy(string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->delete(); // Déclenche Jobs\DeleteDatabase via TenancyServiceProvider
        return response()->json(['message' => 'Tenant supprimé.']);
    }

    public function toggleActif(string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->update(['actif' => !$tenant->actif]);
        return response()->json([
            'actif'   => $tenant->actif,
            'message' => $tenant->actif ? 'Établissement activé.' : 'Établissement désactivé.',
        ]);
    }

    public function uploadApk(Request $request, string $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($id);

        $request->validate([
            'apk' => 'required|file|mimes:apk|max:204800', // 200 Mo max
        ]);

        $fichier = $tenant->id . '.apk';
        Storage::disk('apk')->putFileAs('', $request->file('apk'), $fichier);

        $domaine = $tenant->domains->first()?->domain ?? $tenant->id;

        return response()->json([
            'message'      => 'APK uploadé avec succès.',
            'url_page'     => "https://{$domaine}/app",
            'url_download' => "https://{$domaine}/app/apk",
        ]);
    }

    public function deleteApk(string $id): JsonResponse
    {
        $tenant  = Tenant::findOrFail($id);
        $fichier = $tenant->id . '.apk';

        if (Storage::disk('apk')->exists($fichier)) {
            Storage::disk('apk')->delete($fichier);
        }

        return response()->json(['message' => 'APK supprimé.']);
    }

    private function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Tenant::where('code', $code)->exists());

        return $code;
    }
}
