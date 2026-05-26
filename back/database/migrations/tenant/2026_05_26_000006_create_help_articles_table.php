<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->string('titre', 200);
            $table->text('contenu');                       // Markdown
            $table->string('module', 50);
            // module: dashboard | eleves | enseignants | classes | paiements |
            //         frais_annexes | bulletins | notes | assiduites |
            //         emploi_du_temps | sanctions | communication | statistiques |
            //         export | parametrage | utilisateurs | conseil | inscriptions
            $table->string('categorie', 30)->default('tutoriel');
            // categorie: prise_en_main | tutoriel | faq | astuce
            $table->unsignedTinyInteger('ordre')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->index(['module', 'actif', 'ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('help_articles');
    }
};
