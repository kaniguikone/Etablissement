<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }

    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 14px; }
    .header .etablissement { font-size: 15px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 1px; }
    .header .sous-titre { font-size: 11px; color: #7f8c8d; margin-top: 4px; }

    .titre-doc { text-align: center; margin: 24px 0 20px; }
    .titre-doc h1 { font-size: 20px; color: #2c3e50; text-transform: uppercase; letter-spacing: 2px; text-decoration: underline; }
    .titre-doc p { font-size: 11px; color: #7f8c8d; margin-top: 6px; }

    .corps { line-height: 2; font-size: 13px; margin: 0 20px; }
    .corps p { margin-bottom: 10px; }
    .corps .val { font-weight: bold; border-bottom: 1px dotted #555; display: inline-block; min-width: 180px; padding: 0 4px; }

    .mention { margin-top: 20px; padding: 12px 16px; background: #ecf0f1; border-left: 4px solid #2c3e50; font-size: 12px; line-height: 1.6; }

    .signature { margin-top: 50px; display: table; width: 100%; }
    .signature .left  { display: table-cell; width: 50%; text-align: left;  font-size: 11px; }
    .signature .right { display: table-cell; width: 50%; text-align: right; font-size: 11px; }
    .sign-zone { margin-top: 6px; }
    .sign-label { font-weight: bold; }
    .sign-line { border-top: 1px solid #333; margin-top: 50px; width: 180px; }

    .footer { margin-top: 30px; border-top: 1px solid #bdc3c7; padding-top: 8px; text-align: center; font-size: 10px; color: #7f8c8d; }
</style>
</head>
<body>

<div class="header">
    @if($etablissement?->logo_base64)
    <div style="margin-bottom:8px">
        <img src="{{ $etablissement->logo_base64 }}" alt="Logo" style="max-height:60px; max-width:160px; object-fit:contain" />
    </div>
    @endif
    <div class="etablissement">{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</div>
    @if($etablissement?->slogan)
    <div style="font-size:10px;color:#7f8c8d;margin-top:2px;font-style:italic">{{ $etablissement->slogan }}</div>
    @endif
    <div class="sous-titre">
        @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
        @if($etablissement?->telephone)Tél. : {{ $etablissement->telephone }} @endif
        @if($etablissement?->email) | {{ $etablissement->email }}@endif
    </div>
</div>

<div class="titre-doc">
    <h1>Attestation de scolarité</h1>
    <p>Année scolaire {{ $annee }}</p>
</div>

<div class="corps">
    <p>Je soussigné(e), Chef d'Établissement, certifie que :</p>

    <p>
        <strong>Nom et prénoms :</strong>
        <span class="val">{{ strtoupper($eleve->nom_eleve) }} {{ $eleve->prenoms_eleve }}</span>
    </p>

    @if($eleve->date_naissance_eleve)
    <p>
        <strong>Date de naissance :</strong>
        <span class="val">{{ \Carbon\Carbon::parse($eleve->date_naissance_eleve)->format('d/m/Y') }}</span>
        @if($eleve->lieu_naissance_eleve)
            &nbsp;&nbsp;<strong>Lieu de naissance :</strong>
            <span class="val">{{ $eleve->lieu_naissance_eleve }}</span>
        @endif
    </p>
    @endif

    <p>
        <strong>Matricule :</strong>
        <span class="val">{{ $eleve->matricule_eleve }}</span>
    </p>

    <p>
        <strong>Classe :</strong>
        <span class="val">{{ $eleve->classe?->nom_classe }}</span>
        @if($eleve->classe?->niveau)
            &nbsp;&nbsp;<strong>Niveau :</strong>
            <span class="val">{{ $eleve->classe->niveau->nom_niveau }}</span>
        @endif
    </p>

    <p>
        est régulièrement inscrit(e) dans notre établissement pour l'année scolaire
        <strong>{{ $annee }}</strong>.
    </p>

    <p>
        Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
    </p>
</div>

<div class="signature">
    <div class="left">
        <div class="sign-zone">
            <div class="sign-label">Le Chef d'Établissement</div>
            <div class="sign-line"></div>
        </div>
    </div>
    <div class="right">
        <div class="sign-zone">
            <div>Fait le {{ now()->format('d/m/Y') }}</div>
        </div>
    </div>
</div>

<div class="footer">
    Document généré automatiquement — {{ now()->format('d/m/Y H:i') }}
</div>

</body>
</html>
