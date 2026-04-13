<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Etablissement extends Model
{
    protected $table = 'etablissement';

    protected $fillable = [
        'nom', 'slogan', 'logo', 'adresse', 'ville', 'bp',
        'telephone', 'telephone2', 'email', 'site_web', 'pays',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo ? asset('storage/' . $this->logo) : null;
    }

    /**
     * Retourne le logo encodé en base64 (pour les vues PDF DomPDF).
     * DomPDF ne peut pas charger des URLs HTTP, mais accepte les data URI.
     */
    public function getLogoBase64Attribute(): ?string
    {
        if (!$this->logo) return null;
        $path = storage_path('app/public/' . $this->logo);
        if (!file_exists($path)) return null;
        $mime = mime_content_type($path) ?: 'image/png';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
    }
}
