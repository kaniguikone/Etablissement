<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    /**
     * Surcharge pour absorber les erreurs de verrou SQLite
     * lors de la mise à jour de last_used_at.
     */
    public function save(array $options = []): bool
    {
        try {
            return parent::save($options);
        } catch (\Illuminate\Database\QueryException $e) {
            // SQLite "database is locked" → on ignore silencieusement
            return true;
        }
    }
}
