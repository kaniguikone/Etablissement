<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Bienvenue sur Suivi Scolaire</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.1); }
        .header { background: linear-gradient(135deg, #1a56a0, #0d3b73); color: #fff; padding: 32px; text-align: center; }
        .header h1 { margin: 0 0 8px; font-size: 22px; }
        .header p { margin: 0; opacity: .85; font-size: 14px; }
        .body { padding: 32px; }
        .credentials { background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dbeafe; }
        .cred-row:last-child { border-bottom: none; }
        .cred-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .cred-value { font-weight: 700; color: #1e3a5f; font-size: 15px; }
        .btn { display: block; background: #1a56a0; color: #fff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; text-align: center; margin: 24px 0; }
        .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 16px; }
        .footer { background: #f8fafc; padding: 16px 32px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🎉 Bienvenue, {{ $nomResponsable }} !</h1>
        <p>Votre établissement <strong>{{ $nomEtablissement }}</strong> est prêt.</p>
    </div>
    <div class="body">
        <p>Votre demande d'accès a été acceptée. Vous disposez d'un accès <strong>Démo gratuit</strong> valable jusqu'au <strong>{{ $expireLe }}</strong>.</p>

        <div class="credentials">
            <div class="cred-row">
                <span class="cred-label">Adresse d'accès</span>
                <span class="cred-value">{{ $domaine }}</span>
            </div>
            <div class="cred-row">
                <span class="cred-label">Email administrateur</span>
                <span class="cred-value">{{ $email }}</span>
            </div>
            <div class="cred-row">
                <span class="cred-label">Mot de passe temporaire</span>
                <span class="cred-value">{{ $motDePasse }}</span>
            </div>
        </div>

        <a href="http://{{ $domaine }}/login" class="btn">Accéder à mon établissement</a>

        <div class="warning">
            ⚠️ <strong>Changez votre mot de passe</strong> dès votre première connexion via Menu → Mon Profil.
        </div>
    </div>
    <div class="footer">
        Suivi Scolaire — Pour toute question : contact@suiviscolaire.ci
    </div>
</div>
</body>
</html>
