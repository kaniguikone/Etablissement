<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; }

    /* ── En-tête ── */
    .header { display: table; width: 100%; border-bottom: 3px solid #1a3a5c; padding-bottom: 12px; margin-bottom: 16px; }
    .header-logo  { display: table-cell; vertical-align: middle; width: 90px; }
    .header-logo img { width: 80px; height: 80px; object-fit: contain; }
    .header-text  { display: table-cell; vertical-align: middle; text-align: center; }
    .header-text .pays { font-size: 10px; color: #555; letter-spacing: 1px; text-transform: uppercase; }
    .header-text h1 { font-size: 15px; font-weight: bold; color: #1a3a5c; text-transform: uppercase; margin: 4px 0; }
    .header-text h2 { font-size: 12px; color: #333; margin: 2px 0; }
    .header-text .contacts { font-size: 9px; color: #666; margin-top: 4px; }
    .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 130px; }
    .header-right .annee-badge { background: #1a3a5c; color: white; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 3px; display: inline-block; }
    .header-right .date-gen { font-size: 9px; color: #888; margin-top: 4px; }

    /* ── Titre du rapport ── */
    .titre-rapport { text-align: center; margin: 14px 0; }
    .titre-rapport h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #1a3a5c; letter-spacing: 1px; border: 1px solid #1a3a5c; display: inline-block; padding: 6px 20px; }
    .titre-rapport p { font-size: 10px; color: #555; margin-top: 4px; }

    /* ── Sections ── */
    .section { margin-bottom: 18px; }
    .section-titre { background: #1a3a5c; color: white; font-size: 11px; font-weight: bold; padding: 5px 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Tableaux ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px 7px; }
    th { background: #2c5282; color: white; font-size: 10px; text-align: center; }
    td { vertical-align: middle; }
    tr:nth-child(even) td { background: #f5f8ff; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .fw-bold { font-weight: bold; }
    .subtotal { background: #e8edf5 !important; font-weight: bold; }

    /* ── Indicateurs synthèse ── */
    .kpi-row { display: table; width: 100%; margin-bottom: 10px; }
    .kpi-cell { display: table-cell; text-align: center; padding: 8px 6px; border: 1px solid #ccc; border-radius: 3px; }
    .kpi-val { font-size: 20px; font-weight: bold; color: #1a3a5c; }
    .kpi-lbl { font-size: 9px; color: #555; margin-top: 2px; }
    .kpi-sep { display: table-cell; width: 10px; }

    /* ── Couleurs résultats ── */
    .taux-haut { color: #1a6a2a; font-weight: bold; }
    .taux-moy  { color: #7a5a00; font-weight: bold; }
    .taux-bas  { color: #8a1a1a; font-weight: bold; }

    /* ── Examens officiels ── */
    .examens-grid { display: table; width: 100%; }
    .exam-bloc { display: table-cell; width: 48%; border: 1px solid #1a3a5c; padding: 8px 12px; border-radius: 3px; }
    .exam-sep { display: table-cell; width: 4%; }
    .exam-titre { font-weight: bold; font-size: 11px; color: #1a3a5c; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
    .exam-row { display: table; width: 100%; margin: 3px 0; font-size: 10px; }
    .exam-lbl { display: table-cell; color: #444; }
    .exam-val { display: table-cell; text-align: right; font-weight: bold; }
    .taux-badge { display: inline-block; padding: 2px 8px; color: white; font-size: 11px; font-weight: bold; border-radius: 2px; }

    /* ── Page break ── */
    .page-break { page-break-before: always; }

    /* ── Signature ── */
    .signatures { margin-top: 30px; display: table; width: 100%; font-size: 10px; }
    .sig-cell { display: table-cell; text-align: center; width: 33%; }
    .sig-line { border-top: 1px solid #333; margin-top: 40px; width: 120px; display: inline-block; }

    .footer { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 6px; font-size: 9px; color: #888; text-align: right; }
</style>
</head>
<body>

{{-- ── EN-TÊTE ─────────────────────────────────────────────────────────────── --}}
<div class="header">
    <div class="header-logo">
        @if($etablissement?->logo_base64)
            <img src="{{ $etablissement->logo_base64 }}" alt="Logo">
        @endif
    </div>
    <div class="header-text">
        <div class="pays">République de Côte d'Ivoire</div>
        <h1>{{ $etablissement?->nom ?? 'Établissement scolaire' }}</h1>
        @if($etablissement?->slogan)
            <h2>{{ $etablissement->slogan }}</h2>
        @endif
        <div class="contacts">
            @if($etablissement?->adresse) {{ $etablissement->adresse }} — @endif
            @if($etablissement?->telephone) Tél : {{ $etablissement->telephone }} — @endif
            @if($etablissement?->email) {{ $etablissement->email }} @endif
        </div>
    </div>
    <div class="header-right">
        <div class="annee-badge">{{ $annee }}</div>
        <div class="date-gen">Généré le {{ now()->format('d/m/Y') }}</div>
    </div>
</div>

<div class="titre-rapport">
    <h2>Rapport Statistique Annuel</h2>
    <p>Année scolaire {{ $annee }} — Document à usage officiel</p>
</div>

{{-- ── SECTION 1 : EFFECTIFS ────────────────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">Section 1 — Effectifs des élèves</div>

    {{-- KPIs --}}
    <div class="kpi-row">
        <div class="kpi-cell">
            <div class="kpi-val">{{ $effectifs['total'] }}</div>
            <div class="kpi-lbl">Effectif total</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val" style="color:#1a5a8a">{{ $effectifs['garcons'] }}</div>
            <div class="kpi-lbl">Garçons</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val" style="color:#8a1a5a">{{ $effectifs['filles'] }}</div>
            <div class="kpi-lbl">Filles</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $effectifs['total'] > 0 ? round($effectifs['filles'] / $effectifs['total'] * 100) : 0 }}%</div>
            <div class="kpi-lbl">Part des filles</div>
        </div>
    </div>

    {{-- Tableau par niveau --}}
    <table>
        <thead>
            <tr>
                <th style="text-align:left">Niveau</th>
                <th>Effectif</th>
                <th>Garçons</th>
                <th>Filles</th>
                <th>% Filles</th>
            </tr>
        </thead>
        <tbody>
            @foreach($effectifs['par_niveau'] as $ligne)
            <tr>
                <td>{{ $ligne['nom'] }}</td>
                <td class="text-center fw-bold">{{ $ligne['total'] }}</td>
                <td class="text-center">{{ $ligne['garcons'] }}</td>
                <td class="text-center">{{ $ligne['filles'] }}</td>
                <td class="text-center">{{ $ligne['total'] > 0 ? round($ligne['filles'] / $ligne['total'] * 100) : '—' }}%</td>
            </tr>
            @endforeach
            <tr class="subtotal">
                <td>TOTAL</td>
                <td class="text-center">{{ $effectifs['total'] }}</td>
                <td class="text-center">{{ $effectifs['garcons'] }}</td>
                <td class="text-center">{{ $effectifs['filles'] }}</td>
                <td class="text-center">{{ $effectifs['total'] > 0 ? round($effectifs['filles'] / $effectifs['total'] * 100) : '—' }}%</td>
            </tr>
        </tbody>
    </table>

    @if($effectifs['tranches']->isNotEmpty())
    <p style="font-size:9px;color:#555;margin-bottom:4px">Répartition par tranche d'âge :</p>
    <table>
        <thead>
            <tr>
                @foreach($effectifs['tranches'] as $tranche => $nb)
                    <th>{{ $tranche }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            <tr>
                @foreach($effectifs['tranches'] as $nb)
                    <td class="text-center fw-bold">{{ $nb }}</td>
                @endforeach
            </tr>
        </tbody>
    </table>
    @endif
</div>

{{-- ── SECTION 2 : PERSONNEL ───────────────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">Section 2 — Personnel enseignant</div>

    <div class="kpi-row">
        <div class="kpi-cell">
            <div class="kpi-val">{{ $personnel['total'] }}</div>
            <div class="kpi-lbl">Enseignants</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $personnel['hommes'] }}</div>
            <div class="kpi-lbl">Hommes</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $personnel['femmes'] }}</div>
            <div class="kpi-lbl">Femmes</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $personnel['tauxEncadrement'] }}</div>
            <div class="kpi-lbl">Élèves / Enseignant</div>
        </div>
    </div>

    @if($personnel['parMatiere']->isNotEmpty())
    <table>
        <thead>
            <tr>
                <th style="text-align:left">Matière</th>
                <th>Nb enseignants</th>
            </tr>
        </thead>
        <tbody>
            @foreach($personnel['parMatiere'] as $row)
            <tr>
                <td>{{ $row->libelle_matiere }}</td>
                <td class="text-center">{{ $row->nb }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif
</div>

{{-- ── SECTION 3 : RÉSULTATS SCOLAIRES ────────────────────────────────────── --}}
<div class="section page-break">
    <div class="section-titre">Section 3 — Résultats scolaires (année {{ $annee }})</div>

    @if(empty($resultats))
        <p style="color:#888;font-style:italic">Aucune donnée de notes pour cette année scolaire.</p>
    @else
    <table>
        <thead>
            <tr>
                <th style="text-align:left">Niveau</th>
                <th style="text-align:left">Classe</th>
                <th>Effectif</th>
                <th>Moy. gén.</th>
                <th>Admis</th>
                <th>Échec</th>
                <th>Taux réussite</th>
                <th>Redoublants</th>
            </tr>
        </thead>
        <tbody>
            @php $currentNiveau = ''; @endphp
            @foreach($resultats as $ligne)
                @if($ligne['niveau'] !== $currentNiveau)
                    @php $currentNiveau = $ligne['niveau']; @endphp
                @endif
                <tr>
                    <td>{{ $ligne['niveau'] }}</td>
                    <td class="fw-bold">{{ $ligne['classe'] }}</td>
                    <td class="text-center">{{ $ligne['effectif'] }}</td>
                    <td class="text-center fw-bold">
                        @if($ligne['moyenne'] !== null)
                            <span class="{{ $ligne['moyenne'] >= 14 ? 'taux-haut' : ($ligne['moyenne'] >= 10 ? 'taux-moy' : 'taux-bas') }}">
                                {{ number_format($ligne['moyenne'], 2) }}/20
                            </span>
                        @else
                            —
                        @endif
                    </td>
                    <td class="text-center" style="color:#1a6a2a">{{ $ligne['admis'] }}</td>
                    <td class="text-center" style="color:#8a1a1a">{{ $ligne['echoue'] }}</td>
                    <td class="text-center">
                        @if($ligne['avec_note'] > 0)
                            <span class="{{ $ligne['taux_reussite'] >= 70 ? 'taux-haut' : ($ligne['taux_reussite'] >= 50 ? 'taux-moy' : 'taux-bas') }}">
                                {{ $ligne['taux_reussite'] }}%
                            </span>
                        @else
                            —
                        @endif
                    </td>
                    <td class="text-center">{{ $ligne['redoublants'] ?: '—' }}</td>
                </tr>
            @endforeach

            {{-- Ligne totaux --}}
            @php
                $totEff   = collect($resultats)->sum('effectif');
                $totAdmis = collect($resultats)->sum('admis');
                $totEch   = collect($resultats)->sum('echoue');
                $totAvec  = collect($resultats)->sum('avec_note');
                $totTaux  = $totAvec > 0 ? round($totAdmis / $totAvec * 100) : 0;
                $totRedoub = collect($resultats)->sum('redoublants');
            @endphp
            <tr class="subtotal">
                <td colspan="2">TOTAL ÉTABLISSEMENT</td>
                <td class="text-center">{{ $totEff }}</td>
                <td class="text-center">—</td>
                <td class="text-center" style="color:#1a6a2a">{{ $totAdmis }}</td>
                <td class="text-center" style="color:#8a1a1a">{{ $totEch }}</td>
                <td class="text-center fw-bold">{{ $totTaux }}%</td>
                <td class="text-center">{{ $totRedoub ?: '—' }}</td>
            </tr>
        </tbody>
    </table>
    @endif
</div>

{{-- ── SECTION 4 : ASSIDUITÉ ───────────────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">Section 4 — Assiduité</div>

    @if(empty($assiduite))
        <p style="color:#888;font-style:italic">Aucune donnée d'assiduité pour cette année scolaire.</p>
    @else
    <table>
        <thead>
            <tr>
                <th style="text-align:left">Niveau</th>
                <th style="text-align:left">Classe</th>
                <th>Effectif</th>
                <th>Nb absences</th>
                <th>Moy. absences/élève</th>
            </tr>
        </thead>
        <tbody>
            @foreach($assiduite as $ligne)
            <tr>
                <td>{{ $ligne['niveau'] }}</td>
                <td class="fw-bold">{{ $ligne['classe'] }}</td>
                <td class="text-center">{{ $ligne['effectif'] }}</td>
                <td class="text-center">{{ $ligne['absences'] }}</td>
                <td class="text-center {{ $ligne['moy_absences'] > 20 ? 'taux-bas' : ($ligne['moy_absences'] > 10 ? 'taux-moy' : 'taux-haut') }}">
                    {{ $ligne['moy_absences'] }}
                </td>
            </tr>
            @endforeach
            <tr class="subtotal">
                <td colspan="2">TOTAL</td>
                <td class="text-center">{{ collect($assiduite)->sum('effectif') }}</td>
                <td class="text-center fw-bold">{{ collect($assiduite)->sum('absences') }}</td>
                <td class="text-center">—</td>
            </tr>
        </tbody>
    </table>
    @endif
</div>

{{-- ── SECTION 5 : EXAMENS OFFICIELS ─────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">Section 5 — Examens officiels</div>

    <div class="examens-grid">
        <div class="exam-bloc">
            <div class="exam-titre">B.E.P.C. (3ème)</div>
            @if($examens['bepc_inscrits'] > 0)
                <div class="exam-row"><span class="exam-lbl">Candidats inscrits</span><span class="exam-val">{{ $examens['bepc_inscrits'] }}</span></div>
                <div class="exam-row"><span class="exam-lbl">Admis</span><span class="exam-val">{{ $examens['bepc_admis'] }}</span></div>
                <div class="exam-row">
                    <span class="exam-lbl">Taux de réussite</span>
                    <span class="exam-val">
                        @php $tbepc = $examens['bepc_inscrits'] > 0 ? round($examens['bepc_admis'] / $examens['bepc_inscrits'] * 100) : 0; @endphp
                        <span class="taux-badge" style="background: {{ $tbepc >= 70 ? '#1a6a2a' : ($tbepc >= 50 ? '#7a5a00' : '#8a1a1a') }}">{{ $tbepc }}%</span>
                    </span>
                </div>
            @else
                <p style="color:#888;font-style:italic;font-size:10px">Données non renseignées</p>
            @endif
        </div>
        <div class="exam-sep"></div>
        <div class="exam-bloc">
            <div class="exam-titre">BAC (Terminale)</div>
            @if($examens['bac_inscrits'] > 0)
                <div class="exam-row"><span class="exam-lbl">Candidats inscrits</span><span class="exam-val">{{ $examens['bac_inscrits'] }}</span></div>
                <div class="exam-row"><span class="exam-lbl">Admis</span><span class="exam-val">{{ $examens['bac_admis'] }}</span></div>
                <div class="exam-row">
                    <span class="exam-lbl">Taux de réussite</span>
                    <span class="exam-val">
                        @php $tbac = $examens['bac_inscrits'] > 0 ? round($examens['bac_admis'] / $examens['bac_inscrits'] * 100) : 0; @endphp
                        <span class="taux-badge" style="background: {{ $tbac >= 70 ? '#1a6a2a' : ($tbac >= 50 ? '#7a5a00' : '#8a1a1a') }}">{{ $tbac }}%</span>
                    </span>
                </div>
            @else
                <p style="color:#888;font-style:italic;font-size:10px">Données non renseignées</p>
            @endif
        </div>
    </div>
</div>

{{-- ── SECTION 6 : INFRASTRUCTURE ─────────────────────────────────────────── --}}
<div class="section">
    <div class="section-titre">Section 6 — Infrastructure</div>

    <div class="kpi-row">
        <div class="kpi-cell">
            <div class="kpi-val">{{ $infrastructure['nb_salles'] }}</div>
            <div class="kpi-lbl">Salles de classe</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $infrastructure['capacite_totale'] }}</div>
            <div class="kpi-lbl">Capacité totale</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val">{{ $infrastructure['total_classes'] }}</div>
            <div class="kpi-lbl">Classes actives</div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
            <div class="kpi-val {{ $infrastructure['taux_occupation'] > 100 ? 'taux-bas' : 'taux-haut' }}">
                {{ $infrastructure['taux_occupation'] }}%
            </div>
            <div class="kpi-lbl">Taux d'occupation</div>
        </div>
    </div>
</div>

{{-- ── SIGNATURES ───────────────────────────────────────────────────────────── --}}
<div class="signatures">
    <div class="sig-cell">
        <div>Le Censeur</div>
        <div class="sig-line"></div>
    </div>
    <div class="sig-cell">
        <div>Le Directeur</div>
        <div class="sig-line"></div>
    </div>
    <div class="sig-cell">
        <div>Cachet de l'établissement</div>
        <div class="sig-line"></div>
    </div>
</div>

<div class="footer">
    Rapport généré automatiquement — {{ $etablissement?->nom }} — Année scolaire {{ $annee }}
</div>

</body>
</html>
