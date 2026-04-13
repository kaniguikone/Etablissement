<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application mobile — {{ $nom }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .card {
            background: #fff;
            border-radius: 24px;
            padding: 48px 40px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 24px 64px rgba(0,0,0,0.25);
        }

        .logo-wrapper {
            width: 100px;
            height: 100px;
            border-radius: 20px;
            background: #EEF2FF;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            overflow: hidden;
        }

        .logo-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 20px;
        }

        .logo-icon {
            font-size: 52px;
        }

        h1 {
            font-size: 22px;
            font-weight: 700;
            color: #0D1B2A;
            margin-bottom: 8px;
            line-height: 1.3;
        }

        .subtitle {
            font-size: 15px;
            color: #6B7280;
            margin-bottom: 36px;
            line-height: 1.5;
        }

        /* Bouton télécharger */
        .btn-download {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: #1565C0;
            color: #fff;
            text-decoration: none;
            border-radius: 14px;
            padding: 18px 24px;
            font-size: 16px;
            font-weight: 600;
            transition: background 0.2s, transform 0.1s;
            margin-bottom: 16px;
        }

        .btn-download:hover  { background: #0D47A1; transform: translateY(-1px); }
        .btn-download:active { transform: translateY(0); }

        .btn-download svg { flex-shrink: 0; }

        /* Indisponible */
        .unavailable {
            background: #F3F4F6;
            border-radius: 14px;
            padding: 20px;
            color: #6B7280;
            font-size: 15px;
            margin-bottom: 16px;
        }

        /* Instructions */
        .steps {
            text-align: left;
            background: #F8FAFF;
            border-radius: 12px;
            padding: 20px;
            margin-top: 28px;
        }

        .steps h3 {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }

        .step {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 14px;
            color: #4B5563;
            line-height: 1.4;
        }

        .step:last-child { margin-bottom: 0; }

        .step-num {
            background: #1565C0;
            color: #fff;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            flex-shrink: 0;
            margin-top: 1px;
        }

        .badge-android {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #E8F5E9;
            color: #2E7D32;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 28px;
        }

        .footer {
            margin-top: 28px;
            font-size: 12px;
            color: #9CA3AF;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo-wrapper">
            @if($logo)
                <img src="{{ $logo }}" alt="Logo {{ $nom }}">
            @else
                <span class="logo-icon">🏫</span>
            @endif
        </div>

        <h1>{{ $nom }}</h1>
        <p class="subtitle">Téléchargez l'application mobile pour suivre la scolarité de vos enfants.</p>

        <div class="badge-android">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.34l1.758-3.045a.375.375 0 0 0-.65-.375l-1.78 3.083A10.777 10.777 0 0 0 12 14.25c-1.688 0-3.283.394-4.851 1.153l-1.78-3.083a.375.375 0 0 0-.65.375l1.758 3.045C3.606 17.105 1.875 19.584 1.875 22.5h20.25c0-2.916-1.731-5.395-4.602-7.16z"/>
                <path d="M8.25 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zM15.75 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
                <path d="M7.5 3.75L6 1.5M16.5 3.75L18 1.5"/>
            </svg>
            Android
        </div>

        @if($apkDisponible)
            <a href="/app/apk" class="btn-download">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Télécharger l'application
            </a>
        @else
            <div class="unavailable">
                📲 L'application n'est pas encore disponible.<br>
                Contactez l'administration de l'établissement.
            </div>
        @endif

        <div class="steps">
            <h3>Comment installer</h3>
            <div class="step">
                <div class="step-num">1</div>
                <span>Téléchargez le fichier APK en cliquant sur le bouton ci-dessus.</span>
            </div>
            <div class="step">
                <div class="step-num">2</div>
                <span>Ouvrez le fichier depuis vos notifications ou le dossier <strong>Téléchargements</strong>.</span>
            </div>
            <div class="step">
                <div class="step-num">3</div>
                <span>Si demandé, autorisez l'installation depuis des <strong>sources inconnues</strong> (paramètres de sécurité).</span>
            </div>
            <div class="step">
                <div class="step-num">4</div>
                <span>Connectez-vous avec vos identifiants fournis par l'établissement.</span>
            </div>
        </div>

        <div class="footer">
            © {{ date('Y') }} {{ $nom }}
        </div>
    </div>
</body>
</html>
