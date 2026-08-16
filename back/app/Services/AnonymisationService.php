<?php

namespace App\Services;

use App\Models\Eleve;
use App\Models\Parents;
use App\Models\SanteEleve;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Anonymisation RGPD d'une personne au sein d'un tenant déjà initialisé
 * (tenancy()->initialize() doit avoir été appelé par l'appelant).
 * Anonymise plutôt que supprime : préserve les notes/paiements/assiduités
 * déjà liés, dont la conservation peut rester légalement requise.
 */
class AnonymisationService
{
    public function anonymiserEleve(int $eleveId): void
    {
        $eleve = Eleve::findOrFail($eleveId);

        if ($eleve->photo_eleve) {
            Storage::disk('public')->delete($eleve->photo_eleve);
        }

        SanteEleve::where('eleve_id', $eleveId)->delete();
        DB::table('eleve_parent')->where('eleve_id', $eleveId)->delete();

        $eleve->update([
            'nom_eleve'            => 'Anonymisé',
            'prenoms_eleve'        => '',
            'adresse_eleve'        => null,
            'lieu_naissance_eleve' => null,
            'photo_eleve'          => null,
            'parent_id'            => null,
        ]);
    }

    public function anonymiserParent(int $parentId): void
    {
        $parent = Parents::findOrFail($parentId);

        $parent->update([
            'nom_parent'        => 'Anonymisé',
            'prenom_parent'     => '',
            'numero_parent'     => 'ANON-' . $parentId . '-' . Str::random(10),
            'email_parent'      => null,
            'adresse_parent'    => null,
            'profession_parent' => null,
            'central_user_id'   => null,
        ]);
    }
}
