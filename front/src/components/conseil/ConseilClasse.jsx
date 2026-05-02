import { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DECISIONS = [
    { value: '',                      label: '— Aucune décision —' },
    { value: 'admis_felicitations',   label: 'Admis(e) avec Félicitations' },
    { value: 'admis_encouragements',  label: 'Admis(e) avec Encouragements' },
    { value: 'admis',                 label: 'Admis(e)' },
    { value: 'passage_conditionnel',  label: 'Passage conditionnel' },
    { value: 'avertissement',         label: 'Avertissement' },
    { value: 'blame',                 label: 'Blâme' },
    { value: 'redoublement',          label: 'Redoublement' },
    { value: 'exclu',                 label: 'Exclu(e)' },
];

const BADGE = {
    admis_felicitations:  'success',
    admis_encouragements: 'info',
    admis:                'primary',
    passage_conditionnel: 'warning',
    avertissement:        'warning',
    blame:                'danger',
    redoublement:         'danger',
    exclu:                'dark',
};

const fmtMoy = v => (v != null ? Number(v).toFixed(2) : '—');
const badgeMoy = (v, primary = false) => {
    if (v == null) return 'secondary';
    if (primary) return v >= 10 ? 'primary' : 'danger';
    return v >= 10 ? 'success' : 'danger';
};

const ConseilClasse = () => {
    const { toast } = useToast();

    const [classes, setClasses]                     = useState([]);
    const [periodes, setPeriodes]                   = useState([]);
    const [classeId, setClasseId]                   = useState('');
    const [periodeId, setPeriodeId]                 = useState('');
    const [eleves, setEleves]                       = useState([]);
    const [decisions, setDecisions]                 = useState({});
    const [moyennes, setMoyennes]                   = useState({});       // { [periodeId]: { [eleveId]: number|null } }
    const [periodesAffichees, setPeriodesAffichees] = useState([]);       // périodes ordonnées à afficher
    const [avecDecision, setAvecDecision]           = useState(false);    // true si période = dernière de l'année (décisions du conseil)
    const [avecAnnuelle, setAvecAnnuelle]           = useState(false);    // true si dernière période ET plusieurs périodes dans l'année
    const [chargement, setChargement]               = useState(false);
    const [sauvegarde, setSauvegarde]               = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/classesTout'),
            api.get('/periodes'),
        ]).then(([rc, rp]) => {
            setClasses(Array.isArray(rc.data) ? rc.data : (rc.data?.data ?? []));
            const toutesLesPeriodes = Array.isArray(rp.data) ? rp.data : (rp.data?.data ?? []);
            setPeriodes([...toutesLesPeriodes].sort((a, b) =>
                new Date(b.date_debut) - new Date(a.date_debut)
            ));
        }).catch(() => toast.error('Erreur lors du chargement des données.'));
    }, []);

    const charger = useCallback(async () => {
        if (!classeId || !periodeId) return;
        setChargement(true);
        try {
            const [re, rd] = await Promise.all([
                api.get(`/elevesClasse/${classeId}`),
                api.get(`/decisions-conseil/${classeId}/${periodeId}`),
            ]);

            const elevesList = Array.isArray(re.data) ? re.data : (re.data?.data ?? []);
            setEleves(elevesList);

            const init = {};
            elevesList.forEach(e => {
                const d = rd.data?.[e.id];
                init[e.id] = {
                    decision:              d?.decision ?? '',
                    appreciation_generale: d?.appreciation_generale ?? '',
                };
            });
            setDecisions(init);

            // Périodes de la même année scolaire triées par date croissante
            const periodeChoisie = periodes.find(p => String(p.id) === String(periodeId));
            let periodesToShow    = periodeChoisie ? [periodeChoisie] : [];
            let estDernierePeriode = false;

            if (periodeChoisie) {
                // Grouper par annee_scolaire_id si présent, sinon par champ annee (fallback données sans FK)
                const memeAnnee = [...periodes]
                    .filter(p => periodeChoisie.annee_scolaire_id != null
                        ? String(p.annee_scolaire_id) === String(periodeChoisie.annee_scolaire_id)
                        : p.annee === periodeChoisie.annee
                    )
                    .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

                const idx = memeAnnee.findIndex(p => String(p.id) === String(periodeId));
                if (idx >= 0) {
                    periodesToShow     = memeAnnee.slice(0, idx + 1);
                    estDernierePeriode = idx === memeAnnee.length - 1;
                }
            }

            setPeriodesAffichees(periodesToShow);
            setAvecDecision(estDernierePeriode);
            setAvecAnnuelle(estDernierePeriode && periodesToShow.length > 1);

            const moyResults = await Promise.all(
                periodesToShow.map(p =>
                    api.get(`/moyennes-classe/${classeId}/${p.id}`).then(r => ({ id: p.id, data: r.data }))
                )
            );
            const moy = {};
            moyResults.forEach(({ id, data }) => { moy[id] = data; });
            setMoyennes(moy);
        } catch {
            toast.error('Erreur lors du chargement.');
        } finally {
            setChargement(false);
        }
    }, [classeId, periodeId, periodes]);

    useEffect(() => { charger(); }, [charger]);

    const setDecisionEleve = (eleveId, field, value) => {
        setDecisions(prev => ({
            ...prev,
            [eleveId]: { ...prev[eleveId], [field]: value },
        }));
    };

    const sauvegarder = () => {
        setSauvegarde(true);
        const payload = {
            classe_id:  Number(classeId),
            periode_id: Number(periodeId),
            decisions:  eleves.map(e => ({
                eleve_id:              e.id,
                decision:              decisions[e.id]?.decision || null,
                appreciation_generale: decisions[e.id]?.appreciation_generale || null,
            })),
        };
        api.post('/decisions-conseil/batch', payload)
            .then(() => toast.success('Décisions enregistrées.'))
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setSauvegarde(false));
    };

    const classeSelectionnee  = classes.find(c => String(c.id) === String(classeId));
    const periodeSelectionnee = periodes.find(p => String(p.id) === String(periodeId));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-gavel me-2 text-secondary" />
                        Conseil de classe
                    </h4>
                </div>

                {/* Filtres */}
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label small fw-semibold">Classe</label>
                                <select className="form-select form-select-sm"
                                    value={classeId}
                                    onChange={e => { setClasseId(e.target.value); setEleves([]); }}>
                                    <option value="">— Choisir une classe —</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nom_classe}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-5">
                                <label className="form-label small fw-semibold">Période</label>
                                <select className="form-select form-select-sm"
                                    value={periodeId}
                                    onChange={e => setPeriodeId(e.target.value)}>
                                    <option value="">— Choisir une période —</option>
                                    {periodes.map(p => (
                                        <option key={p.id} value={p.id}>{p.libelle_periode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" />
                    </div>
                )}

                {!chargement && eleves.length > 0 && (
                    <>
                        <div className="alert alert-info small mb-3">
                            <i className="fas fa-info-circle me-2" />
                            {avecDecision
                                ? 'Les décisions et appréciations seront inscrites sur les bulletins PDF (section "Décision du Conseil de Classe").'
                                : 'Saisissez les appréciations du conseil. Les décisions seront prises lors du dernier conseil.'}
                        </div>

                        <div className="card shadow-sm">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span className="fw-semibold small">
                                    {classeSelectionnee?.nom_classe} — {periodeSelectionnee?.libelle_periode}
                                </span>
                                <span className="badge bg-secondary">{eleves.length} élève{eleves.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: 40 }}>#</th>
                                            <th>Élève</th>
                                            {periodesAffichees.map(p => (
                                                <th key={p.id} className="text-center" style={{ width: 85 }}>
                                                    Moy {p.abbr_libelle_periode || p.libelle_periode}
                                                </th>
                                            ))}
                                            {avecAnnuelle && (
                                                <th className="text-center" style={{ width: 95 }}>Moy Annuelle</th>
                                            )}
                                            {avecDecision && <th style={{ width: 240 }}>Décision</th>}
                                            <th>Appréciation générale (prof. principal)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eleves.map((e, i) => {
                                            const d = decisions[e.id] ?? {};
                                            const moysPeriodes  = periodesAffichees.map(p => moyennes[p.id]?.[e.id] ?? null);
                                            // T1 = coeff 1, T2 et T3 = coeff 2
                                            const entrees = periodesAffichees
                                                .map((p, pi) => ({ moy: moysPeriodes[pi], coeff: pi === 0 ? 1 : 2 }))
                                                .filter(x => x.moy !== null);
                                            const sommePonderee = entrees.reduce((s, x) => s + x.moy * x.coeff, 0);
                                            const sommeCoeffs   = entrees.reduce((s, x) => s + x.coeff, 0);
                                            const moyAnnuelle   = sommeCoeffs > 0
                                                ? Math.round(sommePonderee / sommeCoeffs * 100) / 100
                                                : null;
                                            return (
                                                <tr key={e.id}>
                                                    <td className="text-muted small">{i + 1}</td>
                                                    <td>
                                                        <div className="fw-semibold">{e.nom_eleve} {e.prenoms_eleve}</div>
                                                        {avecDecision && d.decision && (
                                                            <span className={`badge bg-${BADGE[d.decision] ?? 'secondary'} mt-1`} style={{ fontSize: 10 }}>
                                                                {DECISIONS.find(dec => dec.value === d.decision)?.label}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {periodesAffichees.map((p, pi) => {
                                                        const moy = moysPeriodes[pi];
                                                        return (
                                                            <td key={p.id} className="text-center">
                                                                <span className={`badge bg-${badgeMoy(moy)}`}>
                                                                    {fmtMoy(moy)}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    {avecAnnuelle && (
                                                        <td className="text-center">
                                                            <span className={`badge bg-${badgeMoy(moyAnnuelle, true)} fw-bold`}>
                                                                {fmtMoy(moyAnnuelle)}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {avecDecision && (
                                                        <td>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                value={d.decision ?? ''}
                                                                onChange={ev => setDecisionEleve(e.id, 'decision', ev.target.value)}>
                                                                {DECISIONS.map(dec => (
                                                                    <option key={dec.value} value={dec.value}>{dec.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    )}
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            maxLength={500}
                                                            placeholder="Ex : Élève sérieux, de bons résultats malgré quelques absences"
                                                            value={d.appreciation_generale ?? ''}
                                                            onChange={ev => setDecisionEleve(e.id, 'appreciation_generale', ev.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer d-flex justify-content-end">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={sauvegarder}
                                    disabled={sauvegarde}>
                                    {sauvegarde
                                        ? <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>
                                        : <><i className="fas fa-save me-1" />Enregistrer les décisions</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {!chargement && classeId && periodeId && eleves.length === 0 && (
                    <div className="alert alert-warning">Aucun élève trouvé pour cette classe.</div>
                )}
            </div>
        </section>
    );
};

export default ConseilClasse;
