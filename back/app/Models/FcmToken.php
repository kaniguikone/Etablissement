<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FcmToken extends Model
{
    protected $fillable = ['owner_type', 'owner_id', 'token'];

    public static function enregistrer(string $ownerType, int $ownerId, string $token): void
    {
        static::updateOrCreate(
            ['owner_type' => $ownerType, 'owner_id' => $ownerId],
            ['token' => $token]
        );
    }

    public static function pour(string $ownerType, int $ownerId): ?string
    {
        return static::where('owner_type', $ownerType)
            ->where('owner_id', $ownerId)
            ->value('token');
    }
}
