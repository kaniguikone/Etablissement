<?php

namespace App\Console\Commands;

use App\Models\CentralEnseignantLink;
use App\Models\CentralParentLink;
use App\Models\CentralUser;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ComptesMultiEtablissements extends Command
{
    protected $signature = 'comptes:multi-etablissements
        {--role=all : parent|enseignant|all}
        {--tous : Inclure tous les statuts (par défaut : liens actifs uniquement)}
        {--json : Sortie JSON au lieu d\'un tableau}';

    protected $description = 'Liste les parents avec des enfants dans plusieurs établissements, et les enseignants qui enseignent dans plusieurs établissements';

    public function handle(): int
    {
        $role   = $this->option('role');
        $sortie = [];

        if ($role === 'all' || $role === 'parent') {
            $sortie['parent'] = $this->comptesParents();
        }

        if ($role === 'all' || $role === 'enseignant') {
            $sortie['enseignant'] = $this->comptesEnseignants();
        }

        if ($this->option('json')) {
            $this->line(json_encode($sortie, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return 0;
        }

        if (array_key_exists('parent', $sortie)) {
            $this->afficherTable('Parents avec enfants dans plusieurs établissements', $sortie['parent']);
        }

        if (array_key_exists('enseignant', $sortie)) {
            $this->afficherTable('Enseignants dans plusieurs établissements', $sortie['enseignant']);
        }

        return 0;
    }

    private function comptesParents(): array
    {
        $query = CentralParentLink::query();

        if (! $this->option('tous')) {
            $query->where('statut', 'actif')
                  ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
        }

        $groupes = (clone $query)
            ->select('central_user_id', DB::raw('COUNT(DISTINCT tenant_id) as nb'))
            ->groupBy('central_user_id')
            ->having('nb', '>', 1)
            ->pluck('nb', 'central_user_id');

        if ($groupes->isEmpty()) {
            return [];
        }

        $liens = $query->whereIn('central_user_id', $groupes->keys())
            ->get(['central_user_id', 'tenant_id', 'matricule_eleve']);

        return $this->assembler($groupes, $liens, 'matricule_eleve');
    }

    private function comptesEnseignants(): array
    {
        $query = CentralEnseignantLink::query();

        if (! $this->option('tous')) {
            $query->where('statut', 'actif');
        }

        $groupes = (clone $query)
            ->select('central_user_id', DB::raw('COUNT(DISTINCT tenant_id) as nb'))
            ->groupBy('central_user_id')
            ->having('nb', '>', 1)
            ->pluck('nb', 'central_user_id');

        if ($groupes->isEmpty()) {
            return [];
        }

        $liens = $query->whereIn('central_user_id', $groupes->keys())
            ->get(['central_user_id', 'tenant_id', 'local_enseignant_id']);

        return $this->assembler($groupes, $liens, null);
    }

    /**
     * Assemble les identités CentralUser + noms des tenants pour chaque groupe.
     *
     * @param  \Illuminate\Support\Collection  $groupes  central_user_id => nb établissements
     * @param  \Illuminate\Support\Collection  $liens    lignes brutes (central_user_id, tenant_id, ...)
     */
    private function assembler($groupes, $liens, ?string $colonneDetail): array
    {
        $utilisateurs = CentralUser::whereIn('id', $groupes->keys())
            ->get(['id', 'nom', 'prenom', 'telephone'])
            ->keyBy('id');

        $tenantIds = $liens->pluck('tenant_id')->unique();
        $tenants   = Tenant::whereIn('id', $tenantIds)->pluck('nom', 'id');

        $lignesParUser = $liens->groupBy('central_user_id');

        $resultat = [];

        foreach ($groupes as $centralUserId => $nb) {
            $user  = $utilisateurs->get($centralUserId);
            $lignes = $lignesParUser->get($centralUserId, collect());

            $etablissements = $lignes->map(function ($ligne) use ($tenants, $colonneDetail) {
                $item = [
                    'tenant_id' => $ligne->tenant_id,
                    'nom'       => $tenants->get($ligne->tenant_id, $ligne->tenant_id),
                ];

                if ($colonneDetail) {
                    $item[$colonneDetail] = $ligne->{$colonneDetail};
                }

                return $item;
            })->values()->all();

            $resultat[] = [
                'id'              => $centralUserId,
                'nom'             => $user?->nom,
                'prenom'          => $user?->prenom,
                'telephone'       => $user?->telephone,
                'nb_etablissements' => $nb,
                'etablissements'  => $etablissements,
            ];
        }

        return $resultat;
    }

    private function afficherTable(string $titre, array $lignes): void
    {
        $this->newLine();
        $this->info($titre.' ('.count($lignes).')');

        if (empty($lignes)) {
            $this->line('  Aucun.');

            return;
        }

        $this->table(
            ['ID', 'Nom', 'Prénom', 'Téléphone', 'Nb écoles', 'Établissements'],
            array_map(fn ($l) => [
                $l['id'],
                $l['nom'],
                $l['prenom'],
                $l['telephone'],
                $l['nb_etablissements'],
                implode(', ', array_column($l['etablissements'], 'nom')),
            ], $lignes)
        );
    }
}
