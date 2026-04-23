<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }

    .header { margin-bottom: 16px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; display: table; width: 100%; }
    .header-logo { display: table-cell; vertical-align: middle; width: 110px; padding-right: 12px; }
    .header-logo img { width: 100px; height: 100px; object-fit: contain; }
    .header-text { display: table-cell; vertical-align: middle; text-align: center; }
    .header h1 { font-size: 18px; color: #2c3e50; text-transform: uppercase; }
    .header h2 { font-size: 14px; color: #34495e; margin-top: 4px; }
    .header p  { font-size: 11px; color: #7f8c8d; margin-top: 2px; }

    .eleve-info { background: #ecf0f1; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; }
    .eleve-info table { width: 100%; }
    .eleve-info td { padding: 2px 6px; font-size: 11px; }
    .eleve-info .label { font-weight: bold; width: 130px; }

    table.notes { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.notes thead tr { background: #2c3e50; color: white; }
    table.notes th, table.notes td { border: 1px solid #bdc3c7; padding: 6px 8px; }
    table.notes th { font-size: 11px; font-weight: bold; }
    table.notes td { font-size: 11px; }
    table.notes tr:nth-child(even) { background: #f8f9fa; }
    table.notes .matiere { font-weight: bold; }
    table.notes .moyenne { font-weight: bold; color: #2c3e50; }
    table.notes .moyenne.faible { color: #e74c3c; }
    table.notes .moyenne.passable { color: #e67e22; }
    table.notes .moyenne.bien { color: #27ae60; }

    .recapitulatif { margin-top: 10px; }
    .recapitulatif h3 { font-size: 13px; color: #2c3e50; border-bottom: 1px solid #bdc3c7; padding-bottom: 4px; margin-bottom: 8px; }
    table.recap { width: 100%; border-collapse: collapse; }
    table.recap td { padding: 5px 10px; border: 1px solid #bdc3c7; font-size: 11px; }
    table.recap .label { font-weight: bold; background: #ecf0f1; width: 200px; }
    .mention { padding: 4px 12px; font-weight: bold; font-size: 12px; color: white; }
    .mention-tb { background: #27ae60; }
    .mention-b  { background: #2ecc71; }
    .mention-ab { background: #f39c12; }
    .mention-p  { background: #e67e22; }
    .mention-i  { background: #e74c3c; }

    .footer { margin-top: 20px; border-top: 1px solid #bdc3c7; padding-top: 10px; text-align: right; font-size: 10px; color: #7f8c8d; }
    .signature { margin-top: 30px; display: table; width: 100%; font-size: 11px; }
    .signature .sig-left  { display: table-cell; width: 50%; text-align: center; }
    .signature .sig-right { display: table-cell; width: 50%; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin-top: 30px; width: 150px; }
</style>
</head>
<body>

<div class="header">
    <div class="header-logo">
        @if($etablissement?->logo_base64)
        <img src="{{ $etablissement->logo_base64 }}" alt="Logo" />
        @endif
    </div>
    <div class="header-text">
        <h1>{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</h1>
        @if($etablissement?->slogan)
        <p style="font-style:italic;color:#7f8c8d;margin:2px 0">{{ $etablissement->slogan }}</p>
        @endif
        <h2>Bulletin de notes — {{ $periode->libelle_periode }} — Année {{ $periode->annee }}</h2>
        <p>
            @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
            @if($etablissement?->telephone)Tél. : {{ $etablissement->telephone }} @endif
            @if($etablissement?->email) | {{ $etablissement->email }}@endif
        </p>
        <p>Édité le {{ now()->format('d/m/Y') }}</p>
    </div>
    <div class="header-logo"></div>
</div>

<div class="eleve-info">
    <table>
        <tr>
            <td class="label">Nom et prénoms :</td>
            <td><strong>{{ strtoupper($eleve->nom_eleve) }} {{ $eleve->prenoms_eleve }}</strong></td>
            <td class="label">Matricule :</td>
            <td>{{ $eleve->matricule_eleve }}</td>
        </tr>
        <tr>
            <td class="label">Classe :</td>
            <td>{{ $eleve->classe?->nom_classe }}</td>
            <td class="label">Date de naissance :</td>
            <td>{{ $eleve->date_naissance_eleve }}</td>
        </tr>
        <tr>
            <td class="label">Rang :</td>
            <td><strong>{{ $rang !== null ? $rang . 'er/' . $effectif : '—' }}</strong></td>
            <td class="label">Effectif :</td>
            <td>{{ $effectif ?? '—' }}</td>
        </tr>
    </table>
</div>

<table class="notes">
    <thead>
        <tr>
            <th style="width:26%">Matière</th>
            <th style="width:6%">Coeff</th>
            @if($estDerniereperiode)
            <th style="width:13%">Moy. T3</th>
            <th style="width:7%">Rg T3</th>
            <th style="width:13%">Moy. Ann.</th>
            <th style="width:7%">Rg Ann.</th>
            @else
            <th style="width:16%">Moyenne</th>
            <th style="width:7%">Rang</th>
            @endif
            <th>Appréciation</th>
        </tr>
    </thead>
    <tbody>
        @foreach($parMatiere as $matiere => $info)
            @php
                $moy    = $info['moyenne'];
                $coeff  = $info['coeff_matiere'] ?? 1;
                $moyAnn = $estDerniereperiode ? ($parMatiereAnnuelle[$matiere]['moyenne'] ?? null) : null;
                $rangAnn = $estDerniereperiode ? ($parMatiereAnnuelle[$matiere]['rang'] ?? null) : null;

                $classe = 'moyenne';
                $appreciation = '—';
                if ($moy !== null) {
                    if ($moy >= 16)      { $classe = 'moyenne bien';     $appreciation = 'Très bien'; }
                    elseif ($moy >= 14)  { $classe = 'moyenne bien';     $appreciation = 'Bien'; }
                    elseif ($moy >= 12)  { $classe = 'moyenne passable'; $appreciation = 'Assez bien'; }
                    elseif ($moy >= 10)  { $classe = 'moyenne passable'; $appreciation = 'Passable'; }
                    else                 { $classe = 'moyenne faible';   $appreciation = 'Insuffisant'; }
                }
            @endphp
            <tr>
                <td class="matiere">{{ $matiere }}</td>
                <td style="text-align:center;color:#64748b">{{ $coeff }}</td>
                <td class="{{ $classe }}">{{ $moy !== null ? number_format($moy, 2) : '—' }}/20</td>
                @if($estDerniereperiode)
                <td style="text-align:center;color:#64748b">{{ $info['rang'] !== null ? $info['rang'] . 'er' : '—' }}</td>
                <td class="moyenne" style="font-weight:bold">{{ $moyAnn !== null ? number_format($moyAnn, 2) : '—' }}/20</td>
                <td style="text-align:center;color:#2c3e50;font-weight:bold">{{ $rangAnn !== null ? $rangAnn . 'er' : '—' }}</td>
                @else
                <td style="text-align:center;color:#64748b">{{ $info['rang'] !== null ? $info['rang'] . 'er' : '—' }}</td>
                @endif
                <td>{{ $appreciation }}</td>
            </tr>
        @endforeach
    </tbody>
</table>

@php
    $mention = '—';
    $mentionClasse = '';
    $refMoy = $estDerniereperiode ? $moyenneAnnuelle : $moyenneGenerale;
    if ($refMoy !== null) {
        if ($refMoy >= 16)      { $mention = 'Très bien';   $mentionClasse = 'mention-tb'; }
        elseif ($refMoy >= 14)  { $mention = 'Bien';         $mentionClasse = 'mention-b'; }
        elseif ($refMoy >= 12)  { $mention = 'Assez bien';   $mentionClasse = 'mention-ab'; }
        elseif ($refMoy >= 10)  { $mention = 'Passable';     $mentionClasse = 'mention-p'; }
        else                    { $mention = 'Insuffisant';  $mentionClasse = 'mention-i'; }
    }
@endphp

<div class="recapitulatif">
    <h3>Récapitulatif</h3>
    <table class="recap">
        <tr>
            <td class="label">Moy. du trimestre</td>
            <td><strong>{{ $moyenneGenerale !== null ? number_format($moyenneGenerale, 2) . '/20' : '—' }}</strong></td>
            @if($estDerniereperiode)
            <td class="label">Moy. annuelle</td>
            <td><strong style="font-size:13px">{{ $moyenneAnnuelle !== null ? number_format($moyenneAnnuelle, 2) . '/20' : '—' }}</strong></td>
            @else
            <td class="label">Mention</td>
            <td><span class="mention {{ $mentionClasse }}">{{ $mention }}</span></td>
            @endif
        </tr>
        @if($estDerniereperiode)
        <tr>
            <td class="label">Mention annuelle</td>
            <td colspan="3"><span class="mention {{ $mentionClasse }}">{{ $mention }}</span></td>
        </tr>
        @endif
    </table>
</div>

<div class="signature">
    <div class="sig-left">
        <div>Le Chef d'établissement</div>
        <div class="sign-line"></div>
    </div>
    <div class="sig-right">
        <div>Parent / Tuteur</div>
        <div class="sign-line"></div>
    </div>
</div>

<div class="footer">
    Document généré automatiquement — {{ now()->format('d/m/Y H:i') }}
</div>

</body>
</html>
