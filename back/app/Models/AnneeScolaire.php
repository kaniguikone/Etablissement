<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnneeScolaire extends Model
{
    protected $table = 'annees_scolaires';

    protected $fillable = ['libelle', 'date_debut', 'date_fin', 'statut'];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin'   => 'date',
        ];
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeEnCours($query)
    {
        return $query->where('statut', 'en_cours');
    }

    public function scopeCloturee($query)
    {
        return $query->where('statut', 'cloturee');
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function periodes()
    {
        return $this->hasMany(Periodes::class);
    }

    public function passageClasses()
    {
        return $this->hasMany(PassageClasse::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public static function courante(): ?self
    {
        return static::where('statut', 'en_cours')->latest()->first();
    }

    public function estModifiable(): bool
    {
        return $this->statut === 'en_cours';
    }

    public function estEnCloture(): bool
    {
        return $this->statut === 'en_cloture';
    }

    public function estCloturee(): bool
    {
        return $this->statut === 'cloturee';
    }
}
