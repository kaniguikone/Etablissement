<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }

    .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
    .header h1 { font-size: 17px; color: #2c3e50; text-transform: uppercase; }
    .header p  { font-size: 10px; color: #7f8c8d; margin-top: 2px; }

    .titre-recu {
        text-align: center; margin: 14px 0 18px;
        font-size: 20px; font-weight: bold; letter-spacing: 2px;
        text-transform: uppercase; color: #1a5276;
        border: 2px solid #1a5276; padding: 8px 0; border-radius: 4px;
    }
    .numero { text-align: right; font-size: 11px; color: #555; margin-bottom: 14px; }

    .bloc { background: #f4f6f9; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px; }
    .bloc h3 { font-size: 12px; text-transform: uppercase; color: #2c3e50; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
    table.info { width: 100%; }
    table.info td { padding: 3px 4px; font-size: 11px; }
    table.info .lbl { font-weight: bold; width: 150px; color: #555; }

    .montant-bloc {
        text-align: center; margin: 18px 0;
        background: #1a5276; color: white;
        padding: 14px; border-radius: 6px;
    }
    .montant-bloc .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; }
    .montant-bloc .montant { font-size: 28px; font-weight: bold; margin-top: 4px; }
    .montant-bloc .devise { font-size: 14px; }

    .mode-badge {
        display: inline-block; padding: 3px 10px;
        border-radius: 12px; font-size: 11px; font-weight: bold;
        background: #d6eaf8; color: #1a5276;
    }

    .signature-bloc {
        margin-top: 30px; display: table; width: 100%;
        font-size: 11px;
    }
    .sig { display: table-cell; width: 50%; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin: 28px auto 0; width: 140px; }

    .footer {
        margin-top: 20px; border-top: 1px solid #ccc;
        padding-top: 8px; text-align: center;
        font-size: 9px; color: #aaa;
    }
    .watermark {
        position: fixed; bottom: 80px; right: 30px;
        font-size: 36px; color: rgba(39,174,96,0.15);
        font-weight: bold; text-transform: uppercase;
        transform: rotate(-30deg); letter-spacing: 4px;
    }
</style>
</head>
<body>

@php
    $modes = ['especes'=>'Espèces','cheque'=>'Chèque','virement'=>'Virement','autre'=>'Autre','cinetpay'=>'CinetPay'];
@endphp

<div class="header">
    @if($etablissement?->logo_base64)
    <div style="margin-bottom:6px">
        <img src="{{ $etablissement->logo_base64 }}" alt="Logo" style="max-height:50px;max-width:130px;object-fit:contain" />
    </div>
    @endif
    <h1>{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</h1>
    @if($etablissement?->slogan)
    <p style="font-style:italic">{{ $etablissement->slogan }}</p>
    @endif
    <p>
        @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
        @if($etablissement?->telephone)Tél. {{ $etablissement->telephone }}@endif
        @if($etablissement?->email) | {{ $etablissement->email }}@endif
    </p>
</div>

<div class="titre-recu">Reçu de paiement</div>

<div class="numero">N° {{ str_pad($paiement->id, 6, '0', STR_PAD_LEFT) }} — Émis le {{ now()->format('d/m/Y') }}</div>

<div class="bloc">
    <h3>Informations sur l'élève</h3>
    <table class="info">
        <tr>
            <td class="lbl">Nom et prénoms :</td>
            <td><strong>{{ strtoupper($paiement->eleve->nom_eleve) }} {{ $paiement->eleve->prenoms_eleve }}</strong></td>
        </tr>
        <tr>
            <td class="lbl">Matricule :</td>
            <td>{{ $paiement->eleve->matricule_eleve }}</td>
        </tr>
        <tr>
            <td class="lbl">Classe :</td>
            <td>{{ $paiement->eleve->classe?->nom_classe }}</td>
        </tr>
        @if($paiement->eleve->classe?->niveau)
        <tr>
            <td class="lbl">Niveau :</td>
            <td>{{ $paiement->eleve->classe->niveau->libelle_niveau ?? '' }}</td>
        </tr>
        @endif
    </table>
</div>

<div class="bloc">
    <h3>Détails du paiement</h3>
    <table class="info">
        <tr>
            <td class="lbl">Objet du paiement :</td>
            <td><strong>{{ $paiement->scolarite?->libelle_echeance ?? '—' }}</strong></td>
        </tr>
        <tr>
            <td class="lbl">Date de paiement :</td>
            <td>{{ \Carbon\Carbon::parse($paiement->date_paiement)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td class="lbl">Mode de paiement :</td>
            <td><span class="mode-badge">{{ $modes[$paiement->mode_paiement] ?? $paiement->mode_paiement }}</span></td>
        </tr>
        @if($paiement->reference_paiement)
        <tr>
            <td class="lbl">Référence :</td>
            <td>{{ $paiement->reference_paiement }}</td>
        </tr>
        @endif
        @if($paiement->remarque)
        <tr>
            <td class="lbl">Remarque :</td>
            <td>{{ $paiement->remarque }}</td>
        </tr>
        @endif
    </table>
</div>

<div class="montant-bloc">
    <div class="label">Montant reçu</div>
    <div class="montant">{{ number_format($paiement->montant_paye, 0, ',', ' ') }} <span class="devise">FCFA</span></div>
</div>

<div class="watermark">Payé</div>

<div class="signature-bloc">
    <div class="sig">
        <div>Le Caissier / Comptable</div>
        <div class="sign-line"></div>
    </div>
    <div class="sig">
        <div>Le Parent / Tuteur</div>
        <div class="sign-line"></div>
    </div>
</div>

<div class="footer">
    Ce document est un reçu officiel de l'établissement. Conservez-le précieusement.<br>
    Généré le {{ now()->format('d/m/Y à H:i') }}
</div>

</body>
</html>
