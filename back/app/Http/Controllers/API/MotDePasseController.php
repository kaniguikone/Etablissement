<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\ReinitialisationMotDePasse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class MotDePasseController extends Controller
{
    private const EXPIRATION_MINUTES = 60;

    /**
     * POST /mot-de-passe/oublie
     * L'utilisateur soumet son email. On génère un token et on envoie le mail.
     */
    public function oublie(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Réponse identique même si l'email est inconnu (évite l'énumération d'utilisateurs)
        if (!$user) {
            return response()->json(['message' => 'Si cet email existe, un lien vous a été envoyé.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            [
                'email'      => $user->email,
                'token'      => Hash::make($token),
                'created_at' => now(),
            ],
            ['email'],
            ['token', 'created_at']
        );

        $frontendUrl = config('app.frontend_url', rtrim(request()->getSchemeAndHttpHost(), '/'));
        $lien = $frontendUrl . '/reinitialiser-mot-de-passe?token=' . $token . '&email=' . urlencode($user->email);

        Mail::to($user->email)->send(new ReinitialisationMotDePasse(
            nomUtilisateur:     $user->name,
            lienReinit:         $lien,
            expirationMinutes:  self::EXPIRATION_MINUTES,
        ));

        return response()->json(['message' => 'Si cet email existe, un lien vous a été envoyé.']);
    }

    /**
     * POST /mot-de-passe/reinitialiser
     * L'utilisateur soumet token + email + nouveau mot de passe.
     */
    public function reinitialiser(Request $request)
    {
        $request->validate([
            'email'                 => 'required|email',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 422);
        }

        $age = now()->diffInMinutes($record->created_at);
        if ($age > self::EXPIRATION_MINUTES) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Lien invalide ou expiré.'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);

        // Invalider tous les tokens actifs de cet utilisateur
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}
