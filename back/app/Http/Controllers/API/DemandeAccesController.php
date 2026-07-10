<?php

declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\NouvelleDemandeAcces;
use App\Models\DemandeAcces;
use App\Models\Etablissement;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class DemandeAccesController extends Controller
{
    /** POST /demande-acces — public, aucune auth requise. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom_etablissement' => 'required|string|max:255',
            'type'              => 'required|in:lycee,lycee_complet,college,primaire',
            'code_ministere'    => 'required|string|max:50',
            'ville'             => 'nullable|string|max:100',
            'telephone'         => 'nullable|string|max:30',
            'nom_responsable'   => 'required|string|max:255',
            'email'             => 'required|email|max:255',
        ]);

        // Empêche les doublons par email ou par code MENET
        if (DemandeAcces::where('email', $data['email'])->whereIn('statut', ['en_attente', 'acceptee'])->exists()) {
            return response()->json([
                'message' => 'Une demande est déjà en cours pour cet email.',
                'errors'  => ['email' => ['Cet email a déjà soumis une demande.']],
            ], 422);
        }

        if (DemandeAcces::where('code_ministere', strtoupper($data['code_ministere']))->whereIn('statut', ['en_attente', 'acceptee'])->exists()) {
            return response()->json([
                'message' => 'Une demande existe déjà pour ce code MENET.',
                'errors'  => ['code_ministere' => ['Ce code MENET a déjà une demande en cours.']],
            ], 422);
        }

        $demande = DemandeAcces::create([
            ...$data,
            'code_ministere' => strtoupper($data['code_ministere']),
        ]);

        // Notifier l'opérateur
        $operateurEmail = config('mail.operator_email');
        if ($operateurEmail) {
            Mail::to($operateurEmail)->send(new NouvelleDemandeAcces($demande));
        }

        return response()->json([
            'message' => 'Votre demande a bien été reçue. Nous vous contacterons dans les 24 heures.',
        ], 201);
    }

    /** GET /superadmin/demandes — liste toutes les demandes. */
    public function index(Request $request): JsonResponse
    {
        $statut = $request->get('statut', 'en_attente');

        $demandes = DemandeAcces::when($statut !== 'toutes', fn($q) => $q->where('statut', $statut))
            ->orderByRaw("FIELD(statut, 'en_attente', 'acceptee', 'refusee')")
            ->orderByDesc('created_at')
            ->get();

        return response()->json($demandes);
    }

    /** POST /superadmin/demandes/{id}/accepter — crée le tenant et envoie les credentials. */
    public function accepter(Request $request, int $id): JsonResponse
    {
        $demande = DemandeAcces::findOrFail($id);

        if ($demande->statut !== 'en_attente') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $code = strtoupper($demande->code_ministere);

        if (Tenant::where('code', $code)->exists()) {
            return response()->json([
                'message' => 'Ce code MENET est déjà utilisé par un tenant existant.',
            ], 422);
        }

        $baseId  = Str::slug($demande->nom_etablissement, '-');
        $id_slug = $this->uniqueTenantId($baseId);
        $domaine = $id_slug . '.' . $this->tenantDomainSuffix();

        $motDePasse = Str::random(10);

        // Création du tenant → déclenche CreateDatabase + MigrateDatabase automatiquement
        $tenant = new Tenant();
        $tenant->id              = $id_slug;
        $tenant->nom             = $demande->nom_etablissement;
        $tenant->code            = $code;
        $tenant->email_contact   = $demande->email;
        $tenant->telephone       = $demande->telephone;
        $tenant->ville           = $demande->ville;
        $tenant->actif           = true;
        $tenant->save();

        $tenant->domains()->create(['domain' => $domaine]);

        tenancy()->initialize($tenant);

        // Appliquer le template (niveaux, matières, séries, coefficients, périodes)
        $annee = $this->anneeEnCours();
        app(TemplateService::class)->appliquer($id_slug, $demande->type, $annee, 'trimestre');
        // TemplateService appelle tenancy()->end() en interne — ré-initialiser
        tenancy()->initialize($tenant);

        Etablissement::create([
            'nom'            => $demande->nom_etablissement,
            'type'           => $demande->type,
            'code_ministere' => $code,
            'ville'          => $demande->ville,
            'telephone'      => $demande->telephone,
            'pays'           => "Côte d'Ivoire",
        ]);

        $this->creerRoles();

        $role = Role::where('nom', 'super_admin')->first();
        User::create([
            'name'                 => $demande->nom_responsable,
            'email'                => $demande->email,
            'password'             => Hash::make($motDePasse),
            'role_id'              => $role?->id,
            'telephone'            => $demande->telephone,
            'actif'                => true,
            'must_change_password' => true,
        ]);

        tenancy()->end();

        $demande->update([
            'statut'               => 'acceptee',
            'tenant_id'            => $id_slug,
            'mot_de_passe_initial' => $motDePasse,
        ]);

        // Envoyer les credentials (non-bloquant — l'établissement est créé même si l'email échoue)
        $emailEnvoye = false;
        try {
            Mail::to($demande->email)->send(new \App\Mail\BienvenuEtablissement(
                nomEtablissement: $demande->nom_etablissement,
                nomResponsable:   $demande->nom_responsable,
                domaine:          $domaine,
                email:            $demande->email,
                motDePasse:       $motDePasse,
            ));
            $emailEnvoye = true;
        } catch (\Throwable $e) {
            \Log::warning('Email credentials non envoyé : ' . $e->getMessage());
        }

        return response()->json([
            'message'       => $emailEnvoye
                ? 'Établissement créé et credentials envoyés par email.'
                : 'Établissement créé. Email non envoyé (vérifiez la config SMTP) — les credentials sont disponibles ci-dessous.',
            'email_envoye'  => $emailEnvoye,
            'domaine'       => $domaine,
            'email'         => $demande->email,
            'mot_de_passe'  => $motDePasse,
        ]);
    }

    /** POST /superadmin/demandes/{id}/refuser */
    public function refuser(Request $request, int $id): JsonResponse
    {
        $demande = DemandeAcces::findOrFail($id);

        if ($demande->statut !== 'en_attente') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $demande->update([
            'statut' => 'refusee',
            'notes'  => $request->get('notes'),
        ]);

        return response()->json(['message' => 'Demande refusée.']);
    }

    private function tenantDomainSuffix(): string
    {
        // En local, toujours localhost — évite que APP_TENANT_DOMAIN de prod s'infiltre en dev
        if (app()->environment('local')) {
            return 'localhost';
        }

        return config('app.tenant_domain', 'suiviscolaire.ci');
    }

    private function anneeEnCours(): string
    {
        $mois = (int) now()->format('m');
        $an   = (int) now()->format('Y');
        return $mois >= 9 ? "{$an}-" . ($an + 1) : ($an - 1) . "-{$an}";
    }

    private function uniqueTenantId(string $base): string
    {
        $id = $base; $counter = 2;
        while (Tenant::find($id)) { $id = "{$base}-{$counter}"; $counter++; }
        return $id;
    }

    private function creerRoles(): void
    {
        $toutesPermissions = array_keys(Role::PERMISSIONS);

        $roles = [
            ['nom' => 'super_admin',  'label' => 'Super Administrateur',         'permissions' => $toutesPermissions,                                                                          'super' => true],
            ['nom' => 'directeur',    'label' => 'Directeur / Proviseur',         'permissions' => array_diff($toutesPermissions, ['utilisateurs']),                                            'super' => false],
            ['nom' => 'censeur',      'label' => 'Censeur / Adjoint pédagogique', 'permissions' => ['eleves', 'enseignants', 'parents', 'pedagogie_saisie', 'pedagogie_pilotage', 'communication'], 'super' => false],
            ['nom' => 'secretaire',   'label' => 'Secrétaire',                    'permissions' => ['inscriptions', 'eleves', 'enseignants', 'parents', 'communication'],                      'super' => false],
            ['nom' => 'comptable',    'label' => 'Comptable',                     'permissions' => ['finances_caisse', 'finances_gestion'],                                                    'super' => false],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(
                ['nom' => $r['nom']],
                ['label' => $r['label'], 'permissions' => $r['permissions'], 'super' => $r['super'], 'actif' => true]
            );
        }
    }
}
