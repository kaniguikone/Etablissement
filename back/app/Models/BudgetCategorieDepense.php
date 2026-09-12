<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetCategorieDepense extends Model
{
    protected $table = 'budget_categories_depense';

    protected $fillable = ['nom', 'actif'];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function depenses()
    {
        return $this->hasMany(BudgetDepense::class, 'categorie_id');
    }
}
