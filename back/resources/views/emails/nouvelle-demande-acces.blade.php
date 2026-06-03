<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle demande d'accès</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.1); }
        .header { background: #0d3b73; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 6px 0 0; opacity: .8; font-size: 14px; }
        .body { padding: 28px 32px; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
        .field value { font-size: 15px; font-weight: 600; color: #111; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-college { background: #dbeafe; color: #1d4ed8; }
        .badge-lycee { background: #ede9fe; color: #6d28d9; }
        .badge-primaire { background: #dcfce7; color: #166534; }
        .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .btn { display: inline-block; background: #0d3b73; color: #fff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 8px; }
        .footer { background: #f8fafc; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🏫 Nouvelle demande d'accès</h1>
        <p>Reçue le {{ now()->format('d/m/Y à H:i') }}</p>
    </div>
    <div class="body">
        <div class="field">
            <label>Établissement</label>
            <value>{{ $demande->nom_etablissement }}</value>
        </div>
        <div class="field">
            <label>Type</label>
            <value>
                <span class="badge badge-{{ $demande->type }}">
                    {{ \App\Models\DemandeAcces::TYPES[$demande->type] ?? $demande->type }}
                </span>
            </value>
        </div>
        <div class="field">
            <label>Code MENET</label>
            <value>{{ $demande->code_ministere }}</value>
        </div>
        @if($demande->ville)
        <div class="field">
            <label>Ville</label>
            <value>{{ $demande->ville }}</value>
        </div>
        @endif
        @if($demande->telephone)
        <div class="field">
            <label>Téléphone</label>
            <value>{{ $demande->telephone }}</value>
        </div>
        @endif
        <hr class="divider">
        <div class="field">
            <label>Responsable</label>
            <value>{{ $demande->nom_responsable }}</value>
        </div>
        <div class="field">
            <label>Email</label>
            <value>{{ $demande->email }}</value>
        </div>
        <hr class="divider">
        <p style="color:#6b7280; font-size:14px;">Connectez-vous au super-admin pour traiter cette demande.</p>
        <a href="{{ config('app.url') }}" class="btn">Accéder au super-admin</a>
    </div>
    <div class="footer">
        Suivi Scolaire — notification automatique
    </div>
</div>
</body>
</html>
