<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'expediteur_type', 'expediteur_id',
        'destinataire_type', 'destinataire_id',
        'eleve_id', 'contenu', 'lu_at',
    ];

    protected $casts = ['lu_at' => 'datetime'];

    public function eleve()
    {
        return $this->belongsTo(Eleve::class);
    }

    /**
     * Scope : tous les messages d'une conversation entre deux interlocuteurs pour un élève.
     */
    public function scopeConversation($query, string $typeA, int $idA, string $typeB, int $idB, ?int $eleveId = null)
    {
        $query->where(function ($q) use ($typeA, $idA, $typeB, $idB) {
            $q->where(function ($q2) use ($typeA, $idA, $typeB, $idB) {
                $q2->where('expediteur_type', $typeA)->where('expediteur_id', $idA)
                   ->where('destinataire_type', $typeB)->where('destinataire_id', $idB);
            })->orWhere(function ($q2) use ($typeA, $idA, $typeB, $idB) {
                $q2->where('expediteur_type', $typeB)->where('expediteur_id', $idB)
                   ->where('destinataire_type', $typeA)->where('destinataire_id', $idA);
            });
        });

        if ($eleveId) {
            $query->where('eleve_id', $eleveId);
        }

        return $query;
    }

    public function scopeNonLus($query, string $type, int $id)
    {
        return $query->where('destinataire_type', $type)
                     ->where('destinataire_id', $id)
                     ->whereNull('lu_at');
    }
}
