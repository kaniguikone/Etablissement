<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DecisionConseil extends Model
{
    protected $table = 'decisions_conseil';

    protected $fillable = ['eleve_id', 'classe_id', 'periode_id', 'decision', 'appreciation_generale'];

    public static array $LABELS = [
        'admis_felicitations'  => 'Admis(e) avec Félicitations',
        'admis_encouragements' => 'Admis(e) avec Encouragements',
        'admis'                => 'Admis(e)',
        'passage_conditionnel' => 'Passage conditionnel',
        'avertissement'        => 'Avertissement',
        'blame'                => 'Blâme',
        'redoublement'         => 'Redoublement',
        'exclu'                => 'Exclu(e)',
    ];

    public function eleve()  { return $this->belongsTo(Eleve::class); }
    public function classe() { return $this->belongsTo(Classe::class); }
    public function periode(){ return $this->belongsTo(Periodes::class); }

    public function getLabelDecisionAttribute(): ?string
    {
        return $this->decision ? static::$LABELS[$this->decision] ?? $this->decision : null;
    }
}
