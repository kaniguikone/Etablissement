<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Chiffre en base les colonnes qui viennent de recevoir le cast Eloquent
 * 'encrypted' (voir migration 2026_08_16_140000). Idempotent : une valeur
 * déjà chiffrée est détectée (Crypt::decryptString réussit) et laissée
 * telle quelle, donc la commande peut être relancée sans risque.
 *
 * À exécuter APRÈS `php artisan tenants:migrate` (élargissement des colonnes)
 * et AVANT d'activer les casts 'encrypted' sur les modèles.
 */
class ChiffrerDonneesExistantes extends Command
{
    protected $signature = 'rgpd:chiffrer-donnees-existantes';

    protected $description = 'Chiffre les données sensibles déjà en base (téléphones User/Etablissement + demandes_acces)';

    private array $colonnesTenant = [
        'users'        => ['telephone'],
        'etablissement' => ['telephone', 'telephone2'],
    ];

    public function handle(): int
    {
        foreach (Tenant::all() as $tenant) {
            $this->line("Tenant: {$tenant->id}");
            tenancy()->initialize($tenant);

            foreach ($this->colonnesTenant as $table => $champs) {
                foreach ($champs as $champ) {
                    $this->chiffrerColonne($table, $champ);
                }
            }

            tenancy()->end();
        }

        $this->chiffrerColonneCentrale('demandes_acces', 'telephone');

        $this->info('Chiffrement terminé.');
        return 0;
    }

    private function chiffrerColonne(string $table, string $colonne): void
    {
        $lignes = DB::table($table)->select('id', $colonne)->whereNotNull($colonne)->where($colonne, '!=', '')->get();

        $compte = 0;
        foreach ($lignes as $ligne) {
            $valeur = $ligne->$colonne;
            if ($this->dejaChiffre($valeur)) continue;

            DB::table($table)->where('id', $ligne->id)->update([$colonne => Crypt::encryptString($valeur)]);
            $compte++;
        }

        if ($compte > 0) {
            $this->line("  {$table}.{$colonne} : {$compte} valeur(s) chiffrée(s)");
        }
    }

    private function chiffrerColonneCentrale(string $table, string $colonne): void
    {
        if (!DB::connection('mysql')->getSchemaBuilder()->hasTable($table)) return;

        $lignes = DB::connection('mysql')->table($table)->select('id', $colonne)->whereNotNull($colonne)->where($colonne, '!=', '')->get();

        $compte = 0;
        foreach ($lignes as $ligne) {
            $valeur = $ligne->$colonne;
            if ($this->dejaChiffre($valeur)) continue;

            DB::connection('mysql')->table($table)->where('id', $ligne->id)->update([$colonne => Crypt::encryptString($valeur)]);
            $compte++;
        }

        if ($compte > 0) {
            $this->line("[central] {$table}.{$colonne} : {$compte} valeur(s) chiffrée(s)");
        }
    }

    private function dejaChiffre(string $valeur): bool
    {
        try {
            Crypt::decryptString($valeur);
            return true;
        } catch (DecryptException) {
            return false;
        }
    }
}
