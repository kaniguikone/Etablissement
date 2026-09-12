<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }

    .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
    .header h1 { font-size: 16px; color: #2c3e50; text-transform: uppercase; }
    .header p  { font-size: 10px; color: #7f8c8d; margin-top: 2px; }

    .titre-rapport {
        text-align: center; margin: 14px 0 18px;
        font-size: 18px; font-weight: bold; letter-spacing: 1px;
        text-transform: uppercase; color: #1a5276;
        border: 2px solid #1a5276; padding: 8px 0; border-radius: 4px;
    }

    .solde-bloc {
        display: table; width: 100%; margin-bottom: 18px;
        background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px;
    }
    .solde-cell { display: table-cell; width: 33%; text-align: center; font-size: 11px; }
    .solde-cell .val { font-size: 16px; font-weight: bold; margin-top: 3px; }
    .solde-cell .val.octroye { color: #27ae60; }
    .solde-cell .val.depense { color: #c0392b; }
    .solde-cell .val.solde   { color: #1a5276; }

    h3.section { font-size: 12px; text-transform: uppercase; color: #2c3e50; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 16px 0 8px; }

    table.liste { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    table.liste th { background: #2E75B6; color: white; font-size: 10px; padding: 5px; text-align: left; border: 1px solid #ccc; }
    table.liste td { font-size: 10px; padding: 4px 5px; border: 1px solid #ddd; }
    table.liste tr:nth-child(even) td { background: #f7f9fb; }
    table.liste td.montant, table.liste th.montant { text-align: right; }
    table.liste tfoot td { font-weight: bold; background: #FFF2CC; }

    .footer {
        margin-top: 20px; border-top: 1px solid #ccc;
        padding-top: 8px; text-align: center;
        font-size: 9px; color: #aaa;
    }
</style>
</head>
<body>

<div class="header">
    @if($etablissement?->logo_base64)
    <div style="margin-bottom:6px">
        <img src="{{ $etablissement->logo_base64 }}" alt="Logo" style="max-height:45px;max-width:120px;object-fit:contain" />
    </div>
    @endif
    <h1>{{ $etablissement?->nom ?? 'Établissement Scolaire' }}</h1>
    <p>
        @if($etablissement?->adresse){{ $etablissement->adresse }}@if($etablissement?->ville), {{ $etablissement->ville }}@endif — @endif
        @if($etablissement?->telephone)Tél. {{ $etablissement->telephone }}@endif
    </p>
</div>

<div class="titre-rapport">Rapport budgétaire — {{ $annee->libelle }}</div>

<div class="solde-bloc">
    <div class="solde-cell">
        <div style="color:#555">Octroyé</div>
        <div class="val octroye">{{ number_format($octroye, 0, ',', ' ') }} FCFA</div>
    </div>
    <div class="solde-cell">
        <div style="color:#555">Dépensé</div>
        <div class="val depense">{{ number_format($totalDepense, 0, ',', ' ') }} FCFA</div>
    </div>
    <div class="solde-cell">
        <div style="color:#555">Solde disponible</div>
        <div class="val solde">{{ number_format($octroye - $totalDepense, 0, ',', ' ') }} FCFA</div>
    </div>
</div>

<h3 class="section">Dotations approuvées</h3>
@if($dotations->isEmpty())
    <p style="color:#888">Aucune dotation approuvée pour cette année.</p>
@else
<table class="liste">
    <thead>
        <tr>
            <th>Référence</th>
            <th>Demandeur</th>
            <th>Motif</th>
            <th>Approuvée le</th>
            <th class="montant">Montant octroyé</th>
        </tr>
    </thead>
    <tbody>
        @foreach($dotations as $d)
        <tr>
            <td>{{ $d->reference }}</td>
            <td>{{ $d->demandeur?->name ?? '—' }}</td>
            <td>{{ $d->motif }}</td>
            <td>{{ \Carbon\Carbon::parse($d->validee_le)->format('d/m/Y') }}</td>
            <td class="montant">{{ number_format($d->montant_octroye, 0, ',', ' ') }} F</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr><td colspan="4">TOTAL OCTROYÉ</td><td class="montant">{{ number_format($octroye, 0, ',', ' ') }} F</td></tr>
    </tfoot>
</table>
@endif

<h3 class="section">Répartition des dépenses par catégorie</h3>
@if($parCategorie->isEmpty())
    <p style="color:#888">Aucune dépense enregistrée pour cette année.</p>
@else
<table class="liste">
    <thead><tr><th>Catégorie</th><th class="montant">Montant</th></tr></thead>
    <tbody>
        @foreach($parCategorie as $c)
        <tr><td>{{ $c['categorie'] }}</td><td class="montant">{{ number_format($c['total'], 0, ',', ' ') }} F</td></tr>
        @endforeach
    </tbody>
</table>
@endif

<h3 class="section">Détail des dépenses</h3>
@if($depenses->isEmpty())
    <p style="color:#888">Aucune dépense enregistrée pour cette année.</p>
@else
<table class="liste">
    <thead>
        <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Catégorie</th>
            <th>Bénéficiaire</th>
            <th>Saisi par</th>
            <th class="montant">Montant</th>
        </tr>
    </thead>
    <tbody>
        @foreach($depenses as $d)
        <tr>
            <td>{{ \Carbon\Carbon::parse($d->date_depense)->format('d/m/Y') }}</td>
            <td>{{ $d->libelle }}</td>
            <td>{{ $d->categorie?->nom ?? '—' }}</td>
            <td>{{ $d->beneficiaire ?? '—' }}</td>
            <td>{{ $d->saisiePar?->name ?? '—' }}</td>
            <td class="montant">{{ number_format($d->montant, 0, ',', ' ') }} F</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr><td colspan="5">TOTAL DÉPENSÉ</td><td class="montant">{{ number_format($totalDepense, 0, ',', ' ') }} F</td></tr>
    </tfoot>
</table>
@endif

<div class="footer">
    Rapport généré le {{ now()->format('d/m/Y à H:i') }} — document interne, à usage de suivi budgétaire.
</div>

</body>
</html>
