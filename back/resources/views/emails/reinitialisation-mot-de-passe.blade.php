<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Réinitialisation de mot de passe</title>
<style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { background: #1a3a5c; padding: 28px 32px; text-align: center; }
    .header h1 { color: white; font-size: 20px; margin: 0; }
    .body { padding: 32px; }
    .body p { color: #444; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: #1a3a5c; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; margin: 8px 0; }
    .note { font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 16px; }
    .url { word-break: break-all; color: #555; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Réinitialisation de mot de passe</h1>
    </div>
    <div class="body">
        <p>Bonjour <strong>{{ $nomUtilisateur }}</strong>,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :</p>
        <p style="text-align:center;">
            <a href="{{ $lienReinit }}" class="btn">Réinitialiser mon mot de passe</a>
        </p>
        <p class="note">
            Ce lien est valide pendant <strong>{{ $expirationMinutes }} minutes</strong>.<br>
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.<br><br>
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <span class="url">{{ $lienReinit }}</span>
        </p>
    </div>
</div>
</body>
</html>
