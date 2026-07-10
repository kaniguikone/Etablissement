<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResetUserPassword extends Command
{
    protected $signature = 'user:reset-password
        {tenant : ID du tenant (ex: college-baraka)}
        {email : Email du compte utilisateur}
        {--password= : Nouveau mot de passe (généré aléatoirement si omis)}
        {--force-change : Oblige l\'utilisateur à changer son mot de passe à la prochaine connexion}';

    protected $description = 'Réinitialiser le mot de passe d\'un utilisateur sur un tenant donné';

    public function handle(): int
    {
        $tenantId = $this->argument('tenant');
        $email    = $this->argument('email');

        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            $this->error("Aucun tenant trouvé avec l'ID '$tenantId'.");
            return 1;
        }

        $password = $this->option('password') ?: Str::random(12);

        tenancy()->initialize($tenant);

        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("Aucun utilisateur trouvé avec l'email '$email' sur le tenant '$tenantId'.");
            tenancy()->end();
            return 1;
        }

        $user->password = Hash::make($password);
        if ($this->option('force-change')) {
            $user->must_change_password = true;
        }
        $user->save();

        tenancy()->end();

        $this->info("✓ Mot de passe réinitialisé pour $email sur $tenantId");
        $this->line("Nouveau mot de passe : $password");

        return 0;
    }
}
