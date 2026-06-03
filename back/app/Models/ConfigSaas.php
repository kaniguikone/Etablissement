<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfigSaas extends Model
{
    protected $connection = 'mysql';
    protected $table      = 'config_saas';

    protected $fillable = ['cle', 'valeur', 'libelle'];

    public static function valeur(string $cle, mixed $defaut = null): mixed
    {
        return self::where('cle', $cle)->value('valeur') ?? $defaut;
    }

    public static function definir(string $cle, string $valeur): void
    {
        self::updateOrCreate(['cle' => $cle], ['valeur' => $valeur]);
    }
}
