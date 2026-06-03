<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Etablissement extends Model
{
    protected $table = 'etablissement';

    protected $fillable = [
        'nom', 'type', 'code_ministere', 'slogan', 'logo', 'adresse', 'ville', 'bp',
        'telephone', 'telephone2', 'email', 'site_web', 'pays',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo ? url('/api/public-storage/' . $this->logo) : null;
    }

    /**
     * Retourne le logo encodé en base64 (pour les vues PDF DomPDF).
     * DomPDF ne peut pas charger des URLs HTTP, mais accepte les data URI.
     */
    public function getLogoBase64Attribute(): ?string
    {
        if (!$this->logo) return null;
        // Storage::disk('public') pointe vers le bon chemin tenant (stancl/tenancy switche le disk)
        if (!Storage::disk('public')->exists($this->logo)) return null;
        $path = Storage::disk('public')->path($this->logo);
        $mime = mime_content_type($path) ?: 'image/png';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
    }
}
