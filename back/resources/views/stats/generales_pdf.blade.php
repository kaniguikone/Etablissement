<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 7.5px; color: #000; }
h1 { font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 2px; }
h2 { font-size: 8.5px; font-weight: bold; margin-bottom: 3px; background: #1a3a5c; color: #fff; padding: 2px 5px; }
.annee { font-size: 8px; text-align: center; color: #555; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 3px; table-layout: fixed; }
th, td { border: 1px solid #aaa; padding: 1.5px 2px; text-align: center; word-wrap: break-word; overflow: hidden; }
th { background: #1a3a5c; color: #fff; font-weight: bold; font-size: 7px; }
th.sub { background: #3a6090; color: #fff; }
td.label { text-align: left; font-size: 7px; }
tr.total td { background: #fff3b0; font-weight: bold; }
.page-break { page-break-before: always; }
.section { margin-bottom: 8px; }
</style>
</head>
<body>

<h1>STATISTIQUES GÉNÉRALES — FORMULAIRE OFFICIEL MENET</h1>
<p class="annee">Année scolaire : {{ $annee }}</p>

{{-- S1 --}}
<div class="section">
<h2>1. RÉPARTITION DES GROUPES PÉDAGOGIQUES PAR NIVEAU — 1ER CYCLE</h2>
@php $s = $data['s1_groupes_pedago']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Indicateur</th>
      @foreach($s['lignes'] as $l)<th>{{ $l['niveau'] }}</th>@endforeach
      <th style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="label">Groupes pédagogiques</td>
      @foreach($s['lignes'] as $l)<td>{{ $l['groupes'] }}</td>@endforeach
      <td style="font-weight:bold">{{ $s['total']['groupes'] }}</td>
    </tr>
    <tr>
      <td class="label">Salles physiques</td>
      @foreach($s['lignes'] as $l)<td>{{ $l['salles'] }}</td>@endforeach
      <td style="font-weight:bold">{{ $s['total']['salles'] }}</td>
    </tr>
  </tbody>
</table>
</div>

{{-- S2 --}}
<div class="section page-break">
<h2>2. EFFECTIFS ET BOURSIERS — 1ER CYCLE</h2>
@php $s = $data['s2_effectifs_bours']; $niveaux = array_column($s['lignes'], 'niveau'); @endphp
<table>
  <thead>
    <tr>
      <th rowspan="2" style="text-align:left">Rubrique</th>
      @foreach($niveaux as $n)<th colspan="2">{{ $n }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      @foreach($niveaux as $n)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach([['Effectif','effectif'],["Dont affectés de l'État",'affectes'],['Dont boursier','boursiers'],['Dont demi-boursier','demi_boursiers']] as [$lbl,$key])
    <tr>
      <td class="label">{{ $lbl }}</td>
      @foreach($s['lignes'] as $l)<td>{{ $l[$key][0] }}</td><td>{{ $l[$key][1] }}</td>@endforeach
      <td style="font-weight:bold">{{ $s['total'][$key][0] }}</td><td>{{ $s['total'][$key][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>

{{-- S3 --}}
<div class="section page-break">
<h2>3. RÉPARTITION PAR LANGUE 2 — 1ER CYCLE</h2>
@php $s = $data['s3_langues']; @endphp
@if(count($s))
@php $niveaux = array_keys(array_diff_key($s[0], ['langue'=>1,'total'=>1])); @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Langue 2</th>
      @foreach($niveaux as $n)<th colspan="2">{{ $n }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($niveaux as $n)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s as $r)
    <tr>
      <td class="label">{{ $r['langue'] }}</td>
      @foreach($niveaux as $n)<td>{{ $r[$n][0] ?? 0 }}</td><td>{{ $r[$n][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif
</div>

{{-- S4 --}}
<div class="section page-break">
<h2>4. RÉPARTITION PAR NATIONALITÉ — 1ER CYCLE</h2>
@php $s = $data['s4_nats_1c']; @endphp
@if(count($s))
@php $niveaux = array_keys(array_diff_key($s[0], ['nationalite'=>1,'total'=>1])); @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Nationalité</th>
      @foreach($niveaux as $n)<th colspan="2">{{ $n }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($niveaux as $n)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s as $r)
    <tr @if(str_starts_with($r['nationalite'],'—')) style="background:#fff3b0;font-weight:bold" @endif>
      <td class="label">{{ $r['nationalite'] }}</td>
      @foreach($niveaux as $n)<td>{{ $r[$n][0] ?? 0 }}</td><td>{{ $r[$n][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif
</div>

{{-- S5 --}}
@if(!empty($data['s5_nats_2c']['lignes']))
<div class="section page-break">
<h2>5. RÉPARTITION PAR NATIONALITÉ — 2ND CYCLE</h2>
@php $s = $data['s5_nats_2c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Nationalité</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr @if(str_starts_with($r['nationalite'],'—')) style="background:#fff3b0;font-weight:bold" @endif>
      <td class="label">{{ $r['nationalite'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>
@endif

{{-- S6 --}}
<div class="section page-break">
<h2>6. ÉLÈVES AFFECTÉS DE L'ÉTAT — 1ER CYCLE</h2>
@php $s = $data['s6_affectes_1c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th rowspan="2" style="text-align:left;width:28%">Rubrique</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr>
      <td class="label">{{ $r['rubrique'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      @if($loop->first)
        <td style="font-weight:bold">{{ $s['total']['inscrits'][0] }}</td><td>{{ $s['total']['inscrits'][1] }}</td>
      @else
        <td style="font-weight:bold">{{ $s['total']['affectes'][0] }}</td><td>{{ $s['total']['affectes'][1] }}</td>
      @endif
    </tr>
    @endforeach
  </tbody>
</table>
</div>

{{-- S7 --}}
@if(!empty($data['s7_affectes_2c']['colonnes']))
<div class="section page-break">
<h2>7. ÉLÈVES AFFECTÉS DE L'ÉTAT — 2ND CYCLE</h2>
@php $s = $data['s7_affectes_2c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th rowspan="2" style="text-align:left;width:28%">Rubrique</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr>
      <td class="label">{{ $r['rubrique'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      @if($loop->first)
        <td style="font-weight:bold">{{ $s['total']['inscrits'][0] }}</td><td>{{ $s['total']['inscrits'][1] }}</td>
      @else
        <td style="font-weight:bold">{{ $s['total']['affectes'][0] }}</td><td>{{ $s['total']['affectes'][1] }}</td>
      @endif
    </tr>
    @endforeach
  </tbody>
</table>
</div>
@endif

{{-- S8 --}}
<div class="section page-break">
<h2>8. RÉPARTITION PAR TRANCHE D'ÂGE — 1ER CYCLE</h2>
@php $s = $data['s8_ages_1c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Tranche d'âge</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr @if($r['tranche'] === 'TOTAL') class="total" @endif>
      <td class="label">{{ $r['tranche'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>

{{-- S9 --}}
<div class="section page-break">
<h2>9. REDOUBLANTS PAR TRANCHE D'ÂGE — 1ER CYCLE</h2>
@php $s = $data['s9_redoub_ages_1c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Tranche d'âge</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr @if($r['tranche'] === 'TOTAL') class="total" @endif>
      <td class="label">{{ $r['tranche'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>

{{-- S10 --}}
@if(!empty($data['s10_ages_2c']['colonnes']))
<div class="section page-break">
<h2>10. RÉPARTITION PAR TRANCHE D'ÂGE — 2ND CYCLE</h2>
@php $s = $data['s10_ages_2c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Tranche d'âge</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr @if($r['tranche'] === 'TOTAL') class="total" @endif>
      <td class="label">{{ $r['tranche'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>
@endif

{{-- S11 --}}
@if(!empty($data['s11_redoub_ages_2c']['colonnes']))
<div class="section page-break">
<h2>11. REDOUBLANTS PAR TRANCHE D'ÂGE — 2ND CYCLE</h2>
@php $s = $data['s11_redoub_ages_2c']; $colonnes = $s['colonnes']; @endphp
<table>
  <thead>
    <tr>
      <th style="text-align:left">Tranche d'âge</th>
      @foreach($colonnes as $c)<th colspan="2">{{ $c }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($colonnes as $c)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr @if($r['tranche'] === 'TOTAL') class="total" @endif>
      <td class="label">{{ $r['tranche'] }}</td>
      @foreach($colonnes as $c)<td>{{ $r[$c][0] ?? 0 }}</td><td>{{ $r[$c][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>
@endif

{{-- S12 --}}
<div class="section page-break">
<h2>12. RÉSULTATS AUX EXAMENS (BEPC / BAC)</h2>
@php $s = $data['s12_examens']; @endphp
<table>
  <thead>
    <tr>
      <th rowspan="2" style="text-align:left">Examen</th>
      <th colspan="2">Inscrits</th>
      <th colspan="2">Présentés</th>
      <th colspan="2">Admis</th>
    </tr>
    <tr>
      <th class="sub">Total</th><th class="sub">Filles</th>
      <th class="sub">Total</th><th class="sub">Filles</th>
      <th class="sub">Total</th><th class="sub">Filles</th>
    </tr>
  </thead>
  <tbody>
    @foreach(['bepc' => 'BEPC', 'bac' => 'BAC'] as $key => $label)
    @php $r = $s[$key]; @endphp
    <tr>
      <td class="label" style="font-weight:bold">{{ $label }}</td>
      <td>{{ $r['inscrits'][0] }}</td><td>{{ $r['inscrits'][1] }}</td>
      <td>{{ $r['presentes'][0] }}</td><td>{{ $r['presentes'][1] }}</td>
      <td>{{ $r['admis'][0] }}</td><td>{{ $r['admis'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>

{{-- S13 --}}
<div class="section page-break">
<h2>13. DÉCISIONS DE FIN D'ANNÉE</h2>
@php $s = $data['s13_decisions']; @endphp
<table>
  <thead>
    <tr>
      <th rowspan="2" style="text-align:left">Niveau</th>
      <th colspan="2">Inscrits</th>
      <th colspan="2">Admis</th>
      <th colspan="2">Redoublants</th>
      <th colspan="2">Exclus</th>
      <th colspan="2">Abandons</th>
      <th colspan="2">Décès</th>
    </tr>
    <tr>
      @for($i=0;$i<6;$i++)<th class="sub">T</th><th class="sub">F</th>@endfor
    </tr>
  </thead>
  <tbody>
    @foreach($s['lignes'] as $r)
    <tr>
      <td class="label" style="font-weight:600">{{ $r['niveau'] }}</td>
      @foreach(['inscrits','admis','redoublants','exclus','abandons','deces'] as $k)
        <td>{{ $r[$k][0] }}</td><td>{{ $r[$k][1] }}</td>
      @endforeach
    </tr>
    @endforeach
    <tr class="total">
      <td class="label">TOTAL</td>
      @foreach(['inscrits','admis','redoublants','exclus','abandons','deces'] as $k)
        <td>{{ $s['total'][$k][0] }}</td><td>{{ $s['total'][$k][1] }}</td>
      @endforeach
    </tr>
  </tbody>
</table>
</div>

{{-- S14 --}}
<div class="section page-break">
<h2>14. ENFANTS VULNÉRABLES</h2>
@php $s = $data['s14_vulnerables']; $niveaux = $s['niveaux']; @endphp

<p style="font-weight:bold;margin:4px 0 2px">Handicaps</p>
<table>
  <thead>
    <tr>
      <th style="text-align:left">Type</th>
      @foreach($niveaux as $n)<th colspan="2">{{ $n }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($niveaux as $n)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['handicaps'] as $r)
    <tr>
      <td class="label">{{ $r['type'] }}</td>
      @foreach($niveaux as $n)<td>{{ $r[$n][0] ?? 0 }}</td><td>{{ $r[$n][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>

<p style="font-weight:bold;margin:6px 0 2px">Orphelins</p>
<table>
  <thead>
    <tr>
      <th style="text-align:left">Catégorie</th>
      @foreach($niveaux as $n)<th colspan="2">{{ $n }}</th>@endforeach
      <th colspan="2" style="background:#c8a800;color:#000">TOTAL</th>
    </tr>
    <tr>
      <th class="sub"></th>
      @foreach($niveaux as $n)<th class="sub">T</th><th class="sub">F</th>@endforeach
      <th class="sub">T</th><th class="sub">F</th>
    </tr>
  </thead>
  <tbody>
    @foreach($s['orphelins'] as $r)
    <tr>
      <td class="label">{{ $r['type'] }}</td>
      @foreach($niveaux as $n)<td>{{ $r[$n][0] ?? 0 }}</td><td>{{ $r[$n][1] ?? 0 }}</td>@endforeach
      <td style="font-weight:bold">{{ $r['total'][0] }}</td><td>{{ $r['total'][1] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
</div>

</body>
</html>
