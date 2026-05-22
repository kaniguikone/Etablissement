<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10.5px; color: #222; }

    .header { margin-bottom: 12px; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; display: table; width: 100%; }
    .header-logo { display: table-cell; vertical-align: middle; width: 90px; padding-right: 10px; }
    .header-logo img { width: 70px; height: 70px; object-fit: contain; }
    .header-text { display: table-cell; vertical-align: middle; text-align: center; }
    .header h1 { font-size: 14px; color: #2c3e50; text-transform: uppercase; }
    .header h2 { font-size: 11px; color: #34495e; margin-top: 3px; }
    .header p  { font-size: 8px; color: #7f8c8d; margin-top: 2px; }

    .classe-title {
        background: #2c3e50;
        color: white;
        padding: 5px 10px;
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 6px;
        border-radius: 3px;
    }

    table.tableau {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
    }
    table.tableau th {
        background: #2c3e50;
        color: white;
        padding: 4px 4px;
        font-size: 9.5px;
        font-weight: bold;
        text-align: center;
        border: 1px solid #1a252f;
    }
    table.tableau th.col-identite {
        text-align: left;
    }
    table.tableau th.periode-header {
        background: #34495e;
        font-size: 9.5px;
    }
    table.tableau th.annuel-header {
        background: #1a6b3c;
        font-size: 9.5px;
    }
    table.tableau td {
        border: 1px solid #bdc3c7;
        padding: 3px 4px;
        font-size: 9.5px;
        text-align: center;
    }
    table.tableau td.identite {
        text-align: left;
        padding: 3px 3px;
    }
    table.tableau td.matricule {
        font-family: monospace;
        font-size: 8.5px;
        color: #555;
        padding: 3px 3px;
    }
    table.tableau tr:nth-child(even) { background: #f8f9fa; }
    table.tableau tr:hover { background: #eaf2ff; }

    .moy { font-weight: bold; }
    .moy-bien    { color: #27ae60; }
    .moy-passable { color: #e67e22; }
    .moy-faible  { color: #e74c3c; }
    .rang        { color: #64748b; font-size: 9px; }

    .footer-classe {
        font-size: 7.5px;
        color: #7f8c8d;
        text-align: right;
        margin-bottom: 4px;
    }

    .page-break { page-break-after: always; }

    .signature { margin-top: 20px; display: table; width: 100%; font-size: 8px; }
    .sig-left  { display: table-cell; width: 50%; text-align: center; }
    .sig-right { display: table-cell; width: 50%; text-align: center; }
    .sign-line { border-top: 1px solid #333; margin-top: 24px; width: 120px; display: inline-block; }

    .doc-footer { margin-top: 16px; border-top: 1px solid #bdc3c7; padding-top: 6px; text-align: right; font-size: 7.5px; color: #7f8c8d; }
</style>
</head>
<body>

@php
    $ordinal = fn($n) => $n === 1 ? '1er' : $n . 'e';
@endphp

@foreach($donnees as $index => $item)
@php
    $classe   = $item['classe'];
    $eleves   = $item['donnees'];
    $effectif = $item['effectif'];
    $isLast   = $index === array_key_last($donnees);
@endphp

{{-- En-tête établissement (répété sur chaque page) --}}
<div class="header">
    <div class="header-logo">
        @if($etablissement?->logo_base64)
        <img src="{{ $etablissement->logo_base64 }}" alt="Logo" />
        @endif
    </div>
    <div class="header-text">
        <h1>{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</h1>
        @if($etablissement?->slogan)
        <p style="font-style:italic">{{ $etablissement->slogan }}</p>
        @endif
        <h2>Tableau des moyennes et rangs — Année scolaire {{ $periodes->first()?->annee }}</h2>
        <p>
            @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
            @if($etablissement?->telephone)Tél. : {{ $etablissement->telephone }} @endif
            — Édité le {{ now()->format('d/m/Y') }}
        </p>
    </div>
    <div class="header-logo"></div>
</div>

{{-- Titre de la classe --}}
<div class="classe-title">
    Classe : {{ $classe->nom_classe }}
    @if($classe->niveau)— {{ $classe->niveau->nom_niveau }}@endif
    &nbsp;&nbsp;|&nbsp;&nbsp;
    Effectif : {{ $effectif }} élève{{ $effectif > 1 ? 's' : '' }}
</div>

@if($eleves->isEmpty())
<p style="color:#888; font-style:italic; padding: 8px;">Aucun élève inscrit dans cette classe.</p>
@else
<table class="tableau">
    <thead>
        <tr>
            <th rowspan="2" class="col-identite" style="width:10%">Matricule</th>
            <th rowspan="2" class="col-identite" style="width:24%">Nom et Prénoms</th>
            @foreach($periodes as $p)
            <th colspan="2" class="periode-header">{{ $p->libelle_periode ?? $p->code_periode }}</th>
            @endforeach
            <th colspan="2" class="annuel-header">Annuel</th>
        </tr>
        <tr>
            @foreach($periodes as $p)
            <th class="periode-header" style="width:7%">Moyenne</th>
            <th class="periode-header" style="width:5%">Rang</th>
            @endforeach
            <th class="annuel-header" style="width:8%">Moyenne</th>
            <th class="annuel-header" style="width:5%">Rang</th>
        </tr>
    </thead>
    <tbody>
        @foreach($eleves as $d)
        @php
            $eleve          = $d['eleve'];
            $moyParPeriode  = $d['moyennesParPeriode'];
            $rangParPeriode = $d['rangsParPeriode'];
            $moyAnn         = $d['moyenneAnnuelle'];
            $rangAnn        = $d['rangAnnuel'];

            $classeAnn = '';
            if ($moyAnn !== null) {
                if ($moyAnn >= 14)     $classeAnn = 'moy moy-bien';
                elseif ($moyAnn >= 10) $classeAnn = 'moy moy-passable';
                else                   $classeAnn = 'moy moy-faible';
            }
        @endphp
        <tr>
            <td class="identite matricule">{{ $eleve->matricule_eleve ?? '—' }}</td>
            <td class="identite">{{ strtoupper($eleve->nom_eleve) }} {{ $eleve->prenoms_eleve }}</td>
            @foreach($periodes as $p)
            @php
                $moy  = $moyParPeriode[$p->id] ?? null;
                $rang = $rangParPeriode[$p->id] ?? null;
                $classeMoy = '';
                if ($moy !== null) {
                    if ($moy >= 14)     $classeMoy = 'moy moy-bien';
                    elseif ($moy >= 10) $classeMoy = 'moy moy-passable';
                    else                $classeMoy = 'moy moy-faible';
                }
            @endphp
            <td class="{{ $classeMoy }}">{{ $moy !== null ? number_format($moy, 2) : '—' }}</td>
            <td class="rang">{{ $rang !== null ? $ordinal($rang) : '—' }}</td>
            @endforeach
            <td class="{{ $classeAnn }}">{{ $moyAnn !== null ? number_format($moyAnn, 2) : '—' }}</td>
            <td class="rang">{{ $rangAnn !== null ? $ordinal($rangAnn) : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer-classe">
    Effectif : {{ $effectif }} — Rangs calculés par ordre olympique (ex æquo = même rang)
</div>
@endif

{{-- Signatures sur la dernière classe --}}
@if($isLast)
<div class="signature">
    <div class="sig-left">
        <div>Le Chef d'établissement</div>
        <span class="sign-line"></span>
    </div>
    <div class="sig-right">
        <div>Le Responsable pédagogique</div>
        <span class="sign-line"></span>
    </div>
</div>
<div class="doc-footer">Document généré automatiquement — {{ now()->format('d/m/Y H:i') }}</div>
@endif

{{-- Saut de page entre les classes --}}
@if(!$isLast)
<div class="page-break"></div>
@endif

@endforeach

</body>
</html>
