<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{ $sujet }}</title>
<style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { padding: 28px 32px; text-align: center; }
    .header h1 { color: white; font-size: 18px; margin: 0; }
    .body { padding: 32px; }
    .body p { color: #444; line-height: 1.7; margin: 0 0 14px; }
    .message-box { background: #f8f9fa; border-left: 4px solid; padding: 14px 16px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .footer-note { font-size: 11px; color: #aaa; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
<div class="container">
    <div class="header" style="background: {{ $couleur }}">
        <h1>{{ $titreNotif }}</h1>
    </div>
    <div class="body">
        <p>Bonjour <strong>{{ $nomParent }}</strong>,</p>
        <p>Voici un message concernant votre enfant <strong>{{ $nomEleve }}</strong> :</p>
        <div class="message-box" style="border-color: {{ $couleur }}">
            <p style="margin:0; color:#333">{{ $corpsNotif }}</p>
        </div>
        <p>Connectez-vous à l'application pour plus de détails.</p>
        <p class="footer-note">
            Cet email a été envoyé automatiquement par le système de gestion scolaire. Merci de ne pas y répondre directement.
        </p>
    </div>
</div>
</body>
</html>
