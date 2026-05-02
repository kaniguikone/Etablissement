<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }

    .header { margin-bottom: 16px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; display: table; width: 100%; }
    .header-logo { display: table-cell; vertical-align: middle; width: 110px; padding-right: 12px; }
    .header-logo img { width: 90px; height: 90px; object-fit: contain; }
    .header-text { display: table-cell; vertical-align: middle; text-align: center; }
    .header h1 { font-size: 17px; color: #2c3e50; text-transform: uppercase; }
    .header h2 { font-size: 13px; color: #34495e; margin-top: 4px; }
    .header p  { font-size: 10px; color: #7f8c8d; margin-top: 2px; }

    .eleve-info { background: #ecf0f1; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; }
    .eleve-info table { width: 100%; }
    .eleve-info td { padding: 2px 6px; font-size: 10px; }
    .eleve-info .label { font-weight: bold; width: 130px; }

    table.releve { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.releve thead tr { background: #2c3e50; color: white; }
    table.releve th, table.releve td { border: 1px solid #bdc3c7; padding: 5px 7px; }
    table.releve th { font-size: 10px; font-weight: bold; }
    table.releve td { font-size: 10px; }
    table.releve tr:nth-child(even) { background: #f8f9fa; }
    table.releve .matiere { font-weight: bold; }
    table.releve .moy { font-weight: bold; color: #2c3e50; }
    table.releve .faible { color: #e74c3c; }
    table.releve .passable { color: #e67e22; }
    table.releve .bien { color: #27ae60; }
    table.releve .total { background: #2c3e50; color: white; font-weight: bold; }

    .recap { margin-top: 10px; }
    .recap h3 { font-size: 12px; color: #2c3e50; border-bottom: 1px solid #bdc3c7; padding-bottom: 4px; margin-bottom: 8px; }
    table.recap-table { width: 100%; border-collapse: collapse; }
    table.recap-table td { padding: 5px 10px; border: 1px solid #bdc3c7; font-size: 10px; }
    table.recap-table .label { font-weight: bold; background: #ecf0f1; width: 200px; }
    .mention { padding: 3px 10px; font-weight: bold; font-size: 11px; color: white; border-radius: 3px; }
    .mention-tb { background: #27ae60; }
    .mention-b  { background: #2ecc71; }
    .mention-ab { background: #f39c12; }
    .mention-p  { background: #e67e22; }
    .mention-i  { background: #e74c3c; }

    .footer { margin-top: 20px; border-top: 1px solid #bdc3c7; padding-top: 8px; text-align: right; font-size: 9px; color: #7f8c8d; }
    .signature { margin-top: 28px; display: table; width: 100%; font-size: 10px; }
    .signature .sig-left  { display: table-cell; width: 50%; text-align: center; }
    .signature .sig-right { display: table-cell; width: 50%; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin-top: 28px; width: 130px; }
    .annee-badge { display: inline-block; background: #2c3e50; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
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
        <h2>Relevé de notes annuel — Année scolaire {{ $annee }}</h2>
        <p>
            @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
            @if($etablissement?->telephone)Tél. : {{ $etablissement->telephone }} @endif
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
            <td class="label">Année scolaire :</td>
            <td colspan="3"><span class="annee-badge">{{ $annee }}</span></td>
        </tr>
    </table>
</div>

<table class="releve">
    <thead>
        <tr>
            <th style="width:28%">Matière</th>
            <th style="width:6%">Coeff</th>
            @foreach($periodes as $periode)
            <th style="width:{{ floor(40 / count($periodes)) }}%">{{ $periode->code_periode ?? $periode->libelle_periode }}</th>
            @endforeach
            <th style="width:12%">Moy. Annuelle</th>
            <th style="width:6%">Rang</th>
        </tr>
    </thead>
    <tbody>
        @foreach($parMatiere as $matiere => $info)
        @php
            $moyAnn = $info['moyenne_annuelle'];
            $classeNote = 'moy';
            if ($moyAnn !== null) {
                if ($moyAnn >= 14)     $classeNote = 'moy bien';
                elseif ($moyAnn >= 10) $classeNote = 'moy passable';
                else                   $classeNote = 'moy faible';
            }
        @endphp
        <tr>
            <td class="matiere">{{ $matiere }}</td>
            <td style="text-align:center;color:#64748b">{{ $info['coeff'] }}</td>
            @foreach($periodes as $periode)
            @php $mP = $info['par_periode'][$periode->id] ?? null; @endphp
            <td style="text-align:center">{{ $mP !== null ? number_format($mP, 2) : '—' }}</td>
            @endforeach
            <td class="{{ $classeNote }}" style="text-align:center;font-weight:bold">
                {{ $moyAnn !== null ? number_format($moyAnn, 2) . '/20' : '—' }}
            </td>
            <td style="text-align:center;color:#64748b">{{ $info['rang'] !== null ? $info['rang'] . 'er' : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr class="total">
            <td colspan="{{ 2 + count($periodes) }}">Moyenne générale annuelle</td>
            <td style="text-align:center">
                {{ $moyenneAnnuelle !== null ? number_format($moyenneAnnuelle, 2) . '/20' : '—' }}
            </td>
            <td style="text-align:center">{{ $rangAnnuel !== null ? $rangAnnuel . 'er/' . $effectif : '—' }}</td>
        </tr>
    </tfoot>
</table>

@php
    $mention = '—'; $mentionClasse = '';
    if ($moyenneAnnuelle !== null) {
        if ($moyenneAnnuelle >= 16)      { $mention = 'Très bien';  $mentionClasse = 'mention-tb'; }
        elseif ($moyenneAnnuelle >= 14)  { $mention = 'Bien';        $mentionClasse = 'mention-b'; }
        elseif ($moyenneAnnuelle >= 12)  { $mention = 'Assez bien';  $mentionClasse = 'mention-ab'; }
        elseif ($moyenneAnnuelle >= 10)  { $mention = 'Passable';    $mentionClasse = 'mention-p'; }
        else                             { $mention = 'Insuffisant'; $mentionClasse = 'mention-i'; }
    }
@endphp

<div class="recap">
    <h3>Récapitulatif annuel</h3>
    <table class="recap-table">
        <tr>
            <td class="label">Moyenne générale annuelle</td>
            <td><strong style="font-size:13px">{{ $moyenneAnnuelle !== null ? number_format($moyenneAnnuelle, 2) . '/20' : '—' }}</strong></td>
            <td class="label">Rang</td>
            <td><strong>{{ $rangAnnuel !== null ? $rangAnnuel . 'er / ' . $effectif . ' élèves' : '—' }}</strong></td>
        </tr>
        <tr>
            <td class="label">Mention</td>
            <td colspan="3"><span class="mention {{ $mentionClasse }}">{{ $mention }}</span></td>
        </tr>
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
