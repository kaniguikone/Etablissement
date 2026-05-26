<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; background: #fff; }

    /* ── En-tête émetteur ── */
    .header { display: table; width: 100%; border-bottom: 3px solid #1a5276; padding-bottom: 14px; margin-bottom: 18px; }
    .header-left  { display: table-cell; width: 55%; vertical-align: top; }
    .header-right { display: table-cell; width: 45%; vertical-align: top; text-align: right; }
    .logo-area h1 { font-size: 18px; color: #1a5276; font-weight: bold; letter-spacing: 1px; }
    .logo-area p  { font-size: 10px; color: #777; margin-top: 2px; }
    .facture-titre { font-size: 26px; font-weight: bold; color: #1a5276; letter-spacing: 2px; }
    .facture-meta  { font-size: 11px; color: #555; margin-top: 6px; }
    .facture-meta .ref { font-weight: bold; color: #222; }

    /* ── Bloc adresses ── */
    .adresses { display: table; width: 100%; margin-bottom: 20px; }
    .adresse-cell { display: table-cell; width: 50%; vertical-align: top; }
    .adresse-bloc { background: #f4f6f9; border-radius: 4px; padding: 10px 14px; margin-right: 10px; }
    .adresse-bloc h4 { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .adresse-bloc p  { font-size: 11px; line-height: 1.5; }

    /* ── Tableau de facturation ── */
    table.lignes { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table.lignes th {
        background: #1a5276; color: #fff;
        padding: 7px 10px; font-size: 11px; text-align: left;
    }
    table.lignes td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
    table.lignes tr:nth-child(even) td { background: #f9f9f9; }
    .plan-badge {
        display: inline-block; padding: 2px 10px; border-radius: 10px;
        font-weight: bold; font-size: 10px;
        background: #d6eaf8; color: #1a5276;
    }

    /* ── Totaux ── */
    .totaux { float: right; width: 260px; margin-bottom: 20px; }
    table.totaux-table { width: 100%; border-collapse: collapse; }
    table.totaux-table td { padding: 5px 10px; font-size: 11px; }
    table.totaux-table .lbl { color: #666; }
    table.totaux-table .val { text-align: right; font-weight: bold; }
    .total-ttc-row td { font-size: 14px; color: #fff; background: #1a5276; font-weight: bold; }
    .clearfix::after { content: ''; display: table; clear: both; }

    /* ── Pied de page ── */
    .conditions { font-size: 9px; color: #888; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; }
    .footer-stamp {
        position: fixed; bottom: 30px; right: 30px;
        font-size: 36px; font-weight: bold; text-transform: uppercase; letter-spacing: 4px;
        transform: rotate(-20deg);
        opacity: 0.12;
    }
    .footer-stamp.emise  { color: #1a5276; }
    .footer-stamp.payee  { color: #27ae60; }

    .statut-badge-payee  { background: #d5f5e3; color: #1e8449; font-weight: bold; padding: 3px 10px; border-radius: 10px; font-size: 11px; }
    .statut-badge-emise  { background: #d6eaf8; color: #1a5276; font-weight: bold; padding: 3px 10px; border-radius: 10px; font-size: 11px; }
</style>
</head>
<body>

@php
    $abo    = $facture->abonnement;
    $tenant = $facture->tenant;
    $plans  = \App\Models\AbonnementSaas::PLANS;
    $plan   = $plans[$abo->plan] ?? ['label' => $abo->plan];
    $periodes = ['mensuel'=>'Mensuel','annuel'=>'Annuel','offert'=>'Offert','personnalise'=>'Personnalisé'];
    $modes    = ['especes'=>'Espèces','cheque'=>'Chèque','virement'=>'Virement bancaire','mobile_money'=>'Mobile Money','offert'=>'—'];
@endphp

<!-- En-tête -->
<div class="header">
    <div class="header-left">
        <div class="logo-area">
            <h1>DigiTech Group</h1>
            <p>Éditeur de logiciels éducatifs — Abidjan, Côte d'Ivoire</p>
            <p>contact@digitechgroupci.com | +225 07 00 00 00 00</p>
        </div>
    </div>
    <div class="header-right">
        <div class="facture-titre">FACTURE</div>
        <div class="facture-meta">
            Réf. : <span class="ref">{{ $facture->reference }}</span><br>
            Date d'émission : {{ \Carbon\Carbon::parse($facture->date_emission)->format('d/m/Y') }}<br>
            Date d'échéance : {{ \Carbon\Carbon::parse($facture->date_echeance)->format('d/m/Y') }}<br>
            Statut :
            @if($facture->statut === 'payee')
                <span class="statut-badge-payee">Payée</span>
            @else
                <span class="statut-badge-emise">À régler</span>
            @endif
        </div>
    </div>
</div>

<!-- Adresses -->
<div class="adresses">
    <div class="adresse-cell">
        <div class="adresse-bloc">
            <h4>Émetteur</h4>
            <p>
                <strong>DigiTech Group SARL</strong><br>
                Logiciels éducatifs<br>
                Abidjan, Côte d'Ivoire<br>
                RC : CI-ABJ-2024-B-12345<br>
                contribuable : 1234567A
            </p>
        </div>
    </div>
    <div class="adresse-cell">
        <div class="adresse-bloc" style="margin-right:0;margin-left:10px">
            <h4>Client</h4>
            <p>
                <strong>{{ $tenant->nom }}</strong><br>
                @if($tenant->ville){{ $tenant->ville }}@if($tenant->pays), {{ $tenant->pays }}@endif<br>@endif
                @if($tenant->email_contact){{ $tenant->email_contact }}<br>@endif
                @if($tenant->telephone)Tél. {{ $tenant->telephone }}<br>@endif
                Code client : <strong>{{ $tenant->code }}</strong>
            </p>
        </div>
    </div>
</div>

<!-- Lignes de facturation -->
<table class="lignes">
    <thead>
        <tr>
            <th style="width:40%">Désignation</th>
            <th>Plan</th>
            <th>Période</th>
            <th>Du</th>
            <th>Au</th>
            <th style="text-align:right">Montant HT</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <strong>Abonnement plateforme SchoolManager</strong><br>
                <small style="color:#666">{{ $plan['description'] ?? '' }}</small>
            </td>
            <td><span class="plan-badge">{{ $plan['label'] }}</span></td>
            <td>{{ $periodes[$abo->periode] ?? $abo->periode }}</td>
            <td>{{ \Carbon\Carbon::parse($abo->date_debut)->format('d/m/Y') }}</td>
            <td>{{ \Carbon\Carbon::parse($abo->date_fin)->format('d/m/Y') }}</td>
            <td style="text-align:right">{{ number_format($facture->montant_ht, 0, ',', ' ') }} FCFA</td>
        </tr>
    </tbody>
</table>

<!-- Totaux -->
<div class="totaux">
    <table class="totaux-table">
        <tr>
            <td class="lbl">Montant HT :</td>
            <td class="val">{{ number_format($facture->montant_ht, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr>
            <td class="lbl">TVA ({{ number_format($facture->taux_tva, 0) }}%) :</td>
            <td class="val">{{ number_format($facture->montant_tva, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr class="total-ttc-row">
            <td>TOTAL TTC :</td>
            <td style="text-align:right">{{ number_format($facture->montant_ttc, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>
</div>
<div class="clearfix"></div>

<!-- Mode de paiement -->
<div style="font-size:11px;margin-top:10px">
    <strong>Mode de règlement :</strong> {{ $modes[$abo->mode_paiement] ?? $abo->mode_paiement }}
    @if($abo->reference_paiement)
        — Réf. : {{ $abo->reference_paiement }}
    @endif
</div>

@if($abo->notes)
<div style="margin-top:8px;font-size:10px;color:#666">
    <em>Note : {{ $abo->notes }}</em>
</div>
@endif

<!-- Tampon -->
<div class="footer-stamp {{ $facture->statut }}">
    {{ $facture->statut === 'payee' ? 'Payée' : 'Original' }}
</div>

<!-- Conditions -->
<div class="conditions">
    <strong>Conditions :</strong> Règlement à réception de facture. Tout retard de paiement entraîne la suspension du service.<br>
    En cas de litige, les tribunaux d'Abidjan sont seuls compétents. TVA à 18% conformément au CGI ivoirien.<br>
    Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }}.
</div>

</body>
</html>
