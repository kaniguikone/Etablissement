<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Contrainte UNIQUE sur numero_parent
        $this->tryAlter('parents', fn(Blueprint $t) => $t->unique('numero_parent'));

        // Contrainte UNIQUE sur matricule_eleve
        $this->tryAlter('eleves', fn(Blueprint $t) => $t->unique('matricule_eleve'));

        // coeff_devoir : string → decimal(5,2)
        Schema::table('devoirs', function (Blueprint $table) {
            $table->decimal('coeff_devoir', 5, 2)->default(1)->change();
        });

        // montant_echeance : string → decimal(10,2)
        Schema::table('scolarites', function (Blueprint $table) {
            $table->decimal('montant_echeance', 10, 2)->change();
        });

        // Index sur assiduites.date_assiduite
        $this->tryAlter('assiduites', fn(Blueprint $t) => $t->index('date_assiduite'));

        // Index composite sur emploi_du_temps(classe_id, jour)
        $this->tryAlter('emploi_du_temps', fn(Blueprint $t) => $t->index(['classe_id', 'jour']));
    }

    public function down(): void
    {
        $this->tryAlter('parents', fn(Blueprint $t) => $t->dropUnique(['numero_parent']));
        $this->tryAlter('eleves', fn(Blueprint $t) => $t->dropUnique(['matricule_eleve']));

        Schema::table('devoirs', function (Blueprint $table) {
            $table->string('coeff_devoir')->change();
        });
        Schema::table('scolarites', function (Blueprint $table) {
            $table->string('montant_echeance')->change();
        });

        $this->tryAlter('assiduites', fn(Blueprint $t) => $t->dropIndex(['date_assiduite']));
        $this->tryAlter('emploi_du_temps', fn(Blueprint $t) => $t->dropIndex(['classe_id', 'jour']));
    }

    /**
     * Execute a Schema::table() alteration silently if the index/constraint already exists
     * (can happen after migrate:fresh with consolidated create_* migrations).
     */
    private function tryAlter(string $table, callable $callback): void
    {
        try {
            Schema::table($table, $callback);
        } catch (\Throwable) {
            // Index ou contrainte déjà présent(e) — rien à faire.
        }
    }
};
