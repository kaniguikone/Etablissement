<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }

    .page { page-break-after: always; padding-bottom: 10px; }
    .page:last-child { page-break-after: auto; }

    .header { margin-bottom: 12px; border-bottom: 2px solid #2c3e50; padding-bottom: 8px; display: table; width: 100%; }
    .header-logo { display: table-cell; vertical-align: middle; width: 90px; }
    .header-logo img { width: 80px; height: 80px; object-fit: contain; }
    .header-text { display: table-cell; vertical-align: middle; text-align: center; }
    .header h1 { font-size: 16px; color: #2c3e50; text-transform: uppercase; }
    .header h2 { font-size: 13px; color: #34495e; margin-top: 3px; }
    .header p  { font-size: 10px; color: #7f8c8d; margin-top: 2px; }

    table.edt { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.edt th, table.edt td { border: 1px solid #999; padding: 3px 4px; text-align: center; vertical-align: middle; }
    table.edt thead th { background: #2c3e50; color: white; font-size: 11px; }
    table.edt .horaire { background: #ecf0f1; font-weight: bold; width: 62px; font-size: 9px; }
    table.edt td.cours { height: 46px; font-size: 9px; line-height: 1.25; }
    table.edt td.cours .m { font-weight: bold; font-size: 10px; }
    table.edt td.cours .d { color: #333; }
    .vide { color: #ccc; }
    .footer { margin-top: 8px; font-size: 9px; color: #7f8c8d; text-align: right; }
</style>
</head>
<body>
@php
    $joursLabels = ['lundi' => 'Lundi', 'mardi' => 'Mardi', 'mercredi' => 'Mercredi', 'jeudi' => 'Jeudi', 'vendredi' => 'Vendredi', 'samedi' => 'Samedi'];
@endphp
@forelse($grilles as $g)
<div class="page">
    <div class="header">
        <div class="header-logo">
            @if($etablissement?->logo_base64)<img src="{{ $etablissement->logo_base64 }}" alt="Logo" />@endif
        </div>
        <div class="header-text">
            <h1>{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</h1>
            <h2>{{ $g['titre'] }}</h2>
            <p>{{ $titreDocument }}</p>
        </div>
        <div class="header-logo"></div>
    </div>

    <table class="edt">
        <thead>
            <tr>
                <th class="horaire">Horaire</th>
                @foreach($g['jours'] as $jour)
                    <th>{{ $joursLabels[$jour] ?? ucfirst($jour) }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($g['horaires'] as [$debut, $fin])
            <tr>
                <td class="horaire">{{ $debut }}<br>{{ $fin }}</td>
                @foreach($g['jours'] as $jour)
                    @php $cell = $g['cellules'][$jour.'|'.$debut] ?? null; @endphp
                    @if($cell)
                        <td class="cours" style="background: {{ $cell['couleur'] }}">
                            @foreach($cell['lignes'] as $i => $ligne)
                                <div class="{{ $i === 0 ? 'm' : 'd' }}">{{ $ligne }}</div>
                            @endforeach
                        </td>
                    @else
                        <td class="cours vide">—</td>
                    @endif
                @endforeach
            </tr>
            @endforeach
        </tbody>
    </table>
    <div class="footer">Généré le {{ $genere_le }}</div>
</div>
@empty
<div class="page"><p>Aucun cours à afficher.</p></div>
@endforelse
</body>
</html>
