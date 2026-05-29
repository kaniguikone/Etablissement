import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const Paire = ({ v }) => v
    ? <span>{v[0]}<small className="text-muted ms-1">({v[1]}F)</small></span>
    : <span className="text-muted">—</span>;

const Spinner = () => (
    <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
    </div>
);

// ── Modale saisie résultats examens ──────────────────────────────────────────

const ModaleExamens = ({ anneeId, examens, onClose, onSaved }) => {
    const { toast } = useToast();
    const [form, setForm] = useState({
        bepc: { nb_inscrits: '', nb_inscrits_filles: '', nb_presentes: '', nb_presentes_filles: '', nb_admis: '', nb_admis_filles: '' },
        bac:  { nb_inscrits: '', nb_inscrits_filles: '', nb_presentes: '', nb_presentes_filles: '', nb_admis: '', nb_admis_filles: '' },
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!examens) return;
        setForm({
            bepc: {
                nb_inscrits:          examens.bepc?.inscrits[0]  ?? '',
                nb_inscrits_filles:   examens.bepc?.inscrits[1]  ?? '',
                nb_presentes:         examens.bepc?.presentes[0] ?? '',
                nb_presentes_filles:  examens.bepc?.presentes[1] ?? '',
                nb_admis:             examens.bepc?.admis[0]     ?? '',
                nb_admis_filles:      examens.bepc?.admis[1]     ?? '',
            },
            bac: {
                nb_inscrits:          examens.bac?.inscrits[0]  ?? '',
                nb_inscrits_filles:   examens.bac?.inscrits[1]  ?? '',
                nb_presentes:         examens.bac?.presentes[0] ?? '',
                nb_presentes_filles:  examens.bac?.presentes[1] ?? '',
                nb_admis:             examens.bac?.admis[0]     ?? '',
                nb_admis_filles:      examens.bac?.admis[1]     ?? '',
            },
        });
    }, [examens]);

    const handleChange = (type, field, value) =>
        setForm(f => ({ ...f, [type]: { ...f[type], [field]: value } }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            for (const type of ['bepc', 'bac']) {
                await api.post('/stats-generales/examens', {
                    annee_scolaire_id: anneeId,
                    type_examen: type,
                    ...Object.fromEntries(Object.entries(form[type]).map(([k, v]) => [k, parseInt(v) || 0])),
                });
            }
            toast.success('Résultats des examens enregistrés.');
            onSaved();
        } catch {
            toast.error('Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    const fields = [
        ['nb_inscrits', 'nb_inscrits_filles', 'Inscrits', 'Dont filles'],
        ['nb_presentes', 'nb_presentes_filles', 'Présentés', 'Dont filles'],
        ['nb_admis', 'nb_admis_filles', 'Admis', 'Dont filles'],
    ];

    return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Saisir les résultats aux examens</h5>
                        <button type="button" className="btn-close" onClick={onClose} />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {['bepc', 'bac'].map(type => (
                                <div key={type} className="mb-4">
                                    <h6 className="fw-bold text-uppercase border-bottom pb-1 mb-3">
                                        {type.toUpperCase()}
                                    </h6>
                                    <div className="row g-2">
                                        {fields.map(([field, fieldF, label, labelF]) => (
                                            <div key={field} className="col-md-4">
                                                <label className="form-label form-label-sm">{label}</label>
                                                <input
                                                    type="number" min="0"
                                                    className="form-control form-control-sm"
                                                    value={form[type][field]}
                                                    onChange={e => handleChange(type, field, e.target.value)}
                                                />
                                                <input
                                                    type="number" min="0"
                                                    className="form-control form-control-sm mt-1"
                                                    placeholder={labelF}
                                                    value={form[type][fieldF]}
                                                    onChange={e => handleChange(type, fieldF, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                {saving && <span className="spinner-border spinner-border-sm me-1" />}
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const StatsGenerales = () => {
    const { toast } = useToast();
    const [data, setData]             = useState(null);
    const [anneeLibelle, setAnneeLibelle] = useState('');
    const [anneeId, setAnneeId]       = useState(null);
    const [loading, setLoading]       = useState(true);
    const [showModale, setShowModale] = useState(false);
    const [exporting, setExporting]   = useState('');

    const chargerStats = () => {
        setLoading(true);
        api.get('/stats-generales')
            .then(r => {
                setData(r.data);
                setAnneeId(r.data.annee?.id ?? null);
                setAnneeLibelle(r.data.annee?.libelle ?? '');
            })
            .catch(() => toast.error('Erreur lors du chargement des statistiques.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { chargerStats(); }, []);

    const handleExport = async (format) => {
        setExporting(format);
        try {
            const endpoint = format === 'excel' ? '/stats-generales/export-excel' : '/stats-generales/export-pdf';
            const ext      = format === 'excel' ? '.xlsx' : '.pdf';
            const mime     = format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';

            const response = await api.get(endpoint, { responseType: 'blob' });

            const url  = URL.createObjectURL(new Blob([response.data], { type: mime }));
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `stats_generales_${anneeLibelle || 'annee'}${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(`Erreur lors de l'export ${format.toUpperCase()}.`);
        } finally {
            setExporting('');
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light border mb-3">
                {/* En-tête */}
                <div className="d-flex justify-content-between align-items-center border-bottom px-3 py-2">
                    <div>
                        <h2 className="mb-0 fs-5 fw-bold">Statistiques générales</h2>
                        <p className="text-muted small mb-0">
                            Formulaire officiel MENET — 14 tableaux
                            {anneeLibelle && <span className="ms-2 badge bg-primary">{anneeLibelle}</span>}
                        </p>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <button
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => setShowModale(true)}
                            disabled={!anneeId}
                            title="Saisir les résultats BEPC / BAC"
                        >
                            <i className="fas fa-pen me-1" /> Résultats examens
                        </button>
                        <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleExport('excel')}
                            disabled={!data || exporting === 'excel'}
                        >
                            {exporting === 'excel'
                                ? <span className="spinner-border spinner-border-sm me-1" />
                                : <i className="fas fa-file-excel me-1" />}
                            Excel
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleExport('pdf')}
                            disabled={!data || exporting === 'pdf'}
                        >
                            {exporting === 'pdf'
                                ? <span className="spinner-border spinner-border-sm me-1" />
                                : <i className="fas fa-file-pdf me-1" />}
                            PDF
                        </button>
                    </div>
                </div>

                {/* Corps */}
                <div className="p-3">
                    {loading && <Spinner />}

                    {!loading && !data && (
                        <div className="text-center text-muted py-5">
                            <i className="fas fa-exclamation-circle fs-2 d-block mb-2 opacity-50" />
                            Aucune année scolaire active. Configurez une année scolaire dans Paramétrage.
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            {/* ── S1 : Groupes pédagogiques ── */}
                            <TableSection titre="1. Groupes pédagogiques — 1er cycle">
                                <table className="table table-sm table-bordered text-center small mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th className="text-start">Indicateur</th>
                                            {data.s1_groupes_pedago.lignes.map(l => <th key={l.niveau}>{l.niveau}</th>)}
                                            <th className="table-warning">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="text-start">Groupes pédagogiques</td>
                                            {data.s1_groupes_pedago.lignes.map(l => <td key={l.niveau}>{l.groupes}</td>)}
                                            <td className="fw-bold">{data.s1_groupes_pedago.total.groupes}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-start">Salles physiques</td>
                                            {data.s1_groupes_pedago.lignes.map(l => <td key={l.niveau}>{l.salles}</td>)}
                                            <td className="fw-bold">{data.s1_groupes_pedago.total.salles}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </TableSection>

                            {/* ── S2 : Effectifs + boursiers ── */}
                            <TableSection titre="2. Effectifs et boursiers — 1er cycle">
                                <NiveauxTable
                                    niveaux={data.s2_effectifs_bours.lignes.map(l => l.niveau)}
                                    rows={[
                                        { label: 'Effectif', getter: l => l.effectif },
                                        { label: "Dont affectés de l'État", getter: l => l.affectes },
                                        { label: 'Dont boursier', getter: l => l.boursiers },
                                        { label: 'Dont demi-boursier', getter: l => l.demi_boursiers },
                                    ]}
                                    lignes={data.s2_effectifs_bours.lignes}
                                    totaux={{ effectif: data.s2_effectifs_bours.total.effectif, affectes: data.s2_effectifs_bours.total.affectes, boursiers: data.s2_effectifs_bours.total.boursiers, demi_boursiers: data.s2_effectifs_bours.total.demi_boursiers }}
                                />
                            </TableSection>

                            {/* ── S3 : Langues ── */}
                            <TableSection titre="3. Répartition par langue — 1er cycle">
                                <TableLangues data={data.s3_langues} />
                            </TableSection>

                            {/* ── S4 : Nationalités 1C ── */}
                            <TableSection titre="4. Répartition par nationalité — 1er cycle">
                                <TableNationalites lignes={data.s4_nats_1c} />
                            </TableSection>

                            {/* ── S5 : Nationalités 2C ── */}
                            {data.s5_nats_2c?.lignes?.length > 0 && (
                                <TableSection titre="5. Répartition par nationalité — 2nd cycle">
                                    <TableNationalites2c data={data.s5_nats_2c} />
                                </TableSection>
                            )}

                            {/* ── S12 : Examens ── */}
                            <TableSection titre="12. Résultats aux examens">
                                <table className="table table-sm table-bordered text-center small mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th rowSpan={2}>Examen</th>
                                            <th colSpan={2}>Inscrits</th>
                                            <th colSpan={2}>Présentés</th>
                                            <th colSpan={2}>Admis</th>
                                        </tr>
                                        <tr className="table-secondary">
                                            {['Total','F','Total','F','Total','F'].map((h,i) => <th key={i}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[['BEPC','bepc'],['BAC','bac']].map(([label, key]) => {
                                            const r = data.s12_examens[key];
                                            return (
                                                <tr key={key}>
                                                    <td className="fw-bold">{label}</td>
                                                    <td>{r.inscrits[0]}</td><td className="text-muted">{r.inscrits[1]}</td>
                                                    <td>{r.presentes[0]}</td><td className="text-muted">{r.presentes[1]}</td>
                                                    <td>{r.admis[0]}</td><td className="text-muted">{r.admis[1]}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableSection>

                            {/* ── S13 : Décisions ── */}
                            <TableSection titre="13. Décisions de fin d'année">
                                <table className="table table-sm table-bordered text-center small mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th rowSpan={2}>Niveau</th>
                                            {['Inscrits','Admis','Redoublants','Exclus','Abandons','Décès'].map(h => <th colSpan={2} key={h}>{h}</th>)}
                                        </tr>
                                        <tr className="table-secondary">
                                            {Array(6).fill(null).flatMap((_, i) => [<th key={`t${i}`}>T</th>,<th key={`f${i}`}>F</th>])}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.s13_decisions.lignes.map(r => (
                                            <tr key={r.niveau}>
                                                <td className="fw-semibold">{r.niveau}</td>
                                                {['inscrits','admis','redoublants','exclus','abandons','deces'].map(k => [
                                                    <td key={k+'t'}>{r[k][0]}</td>,
                                                    <td key={k+'f'} className="text-muted">{r[k][1]}</td>,
                                                ])}
                                            </tr>
                                        ))}
                                        <tr className="table-warning fw-bold">
                                            <td>TOTAL</td>
                                            {['inscrits','admis','redoublants','exclus','abandons','deces'].map(k => [
                                                <td key={k+'t'}>{data.s13_decisions.total[k][0]}</td>,
                                                <td key={k+'f'} className="text-muted">{data.s13_decisions.total[k][1]}</td>,
                                            ])}
                                        </tr>
                                    </tbody>
                                </table>
                            </TableSection>

                            <div className="alert alert-info d-flex align-items-center gap-2 small mt-3">
                                <i className="fas fa-info-circle" />
                                <span>
                                    Les tableaux <strong>Langues, Nationalités, Affectés, Âges, Redoublants par âge et Vulnérables</strong> sont
                                    disponibles en intégralité dans les exports <strong>Excel</strong> et <strong>PDF</strong>.
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showModale && (
                <ModaleExamens
                    anneeId={anneeId}
                    examens={data?.s12_examens}
                    onClose={() => setShowModale(false)}
                    onSaved={() => {
                        setShowModale(false);
                        chargerStats();
                    }}
                />
            )}
        </section>
    );
};

// ── Composants de tableau réutilisables ───────────────────────────────────────

const TableSection = ({ titre, children }) => (
    <div className="mb-4">
        <div className="fw-bold small text-white bg-primary px-2 py-1 mb-1 rounded-top">{titre}</div>
        <div className="table-responsive">{children}</div>
    </div>
);

const NiveauxTable = ({ niveaux, rows, lignes, totaux }) => (
    <table className="table table-sm table-bordered text-center small mb-0">
        <thead className="table-dark">
            <tr>
                <th className="text-start">Rubrique</th>
                {niveaux.map(n => <th key={n} colSpan={2}>{n}</th>)}
                <th colSpan={2} className="table-warning">TOTAL</th>
            </tr>
            <tr className="table-secondary">
                <th />
                {niveaux.flatMap(n => [<th key={n+'t'}>T</th>,<th key={n+'f'}>F</th>])}
                <th>T</th><th>F</th>
            </tr>
        </thead>
        <tbody>
            {rows.map(({ label, getter }) => {
                const totKey = label === 'Effectif' ? 'effectif'
                    : label.includes('affecté') ? 'affectes'
                    : label.includes('demi') ? 'demi_boursiers' : 'boursiers';
                return (
                    <tr key={label}>
                        <td className="text-start">{label}</td>
                        {lignes.map(l => {
                            const v = getter(l);
                            return [<td key={l.niveau+'t'}>{v[0]}</td>,<td key={l.niveau+'f'} className="text-muted">{v[1]}</td>];
                        })}
                        <td className="fw-bold">{totaux[totKey]?.[0] ?? 0}</td>
                        <td className="text-muted">{totaux[totKey]?.[1] ?? 0}</td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

const TableLangues = ({ data }) => {
    if (!data?.length) return null;
    const niveaux = Object.keys(data[0]).filter(k => k !== 'langue' && k !== 'total');
    return (
        <table className="table table-sm table-bordered text-center small mb-0">
            <thead className="table-dark">
                <tr>
                    <th className="text-start">Langue 2</th>
                    {niveaux.map(n => <th key={n} colSpan={2}>{n}</th>)}
                    <th colSpan={2} className="table-warning">TOTAL</th>
                </tr>
                <tr className="table-secondary"><th />{niveaux.flatMap(n => [<th key={n+'t'}>T</th>,<th key={n+'f'}>F</th>])}<th>T</th><th>F</th></tr>
            </thead>
            <tbody>
                {data.map(r => (
                    <tr key={r.langue}>
                        <td className="text-start">{r.langue}</td>
                        {niveaux.flatMap(n => [<td key={n+'t'}>{r[n]?.[0] ?? 0}</td>,<td key={n+'f'} className="text-muted">{r[n]?.[1] ?? 0}</td>])}
                        <td className="fw-bold">{r.total[0]}</td><td className="text-muted">{r.total[1]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const TableNationalites = ({ lignes }) => {
    if (!lignes?.length) return null;
    const niveaux = Object.keys(lignes[0]).filter(k => k !== 'nationalite' && k !== 'total');
    return (
        <table className="table table-sm table-bordered text-center small mb-0">
            <thead className="table-dark">
                <tr>
                    <th className="text-start">Nationalité</th>
                    {niveaux.map(n => <th key={n} colSpan={2}>{n}</th>)}
                    <th colSpan={2} className="table-warning">TOTAL</th>
                </tr>
                <tr className="table-secondary"><th />{niveaux.flatMap(n => [<th key={n+'t'}>T</th>,<th key={n+'f'}>F</th>])}<th>T</th><th>F</th></tr>
            </thead>
            <tbody>
                {lignes.map(r => (
                    <tr key={r.nationalite} className={r.nationalite.startsWith('—') ? 'table-warning fw-bold' : ''}>
                        <td className="text-start">{r.nationalite}</td>
                        {niveaux.flatMap(n => [<td key={n+'t'}>{r[n]?.[0] ?? 0}</td>,<td key={n+'f'} className="text-muted">{r[n]?.[1] ?? 0}</td>])}
                        <td className="fw-bold">{r.total[0]}</td><td className="text-muted">{r.total[1]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const TableNationalites2c = ({ data }) => {
    if (!data?.lignes?.length) return null;
    const { colonnes, lignes } = data;
    return (
        <table className="table table-sm table-bordered text-center small mb-0">
            <thead className="table-dark">
                <tr>
                    <th className="text-start">Nationalité</th>
                    {colonnes.map(c => <th key={c} colSpan={2}>{c}</th>)}
                    <th colSpan={2} className="table-warning">TOTAL</th>
                </tr>
                <tr className="table-secondary"><th />{colonnes.flatMap(c => [<th key={c+'t'}>T</th>,<th key={c+'f'}>F</th>])}<th>T</th><th>F</th></tr>
            </thead>
            <tbody>
                {lignes.map(r => (
                    <tr key={r.nationalite} className={r.nationalite.startsWith('—') ? 'table-warning fw-bold' : ''}>
                        <td className="text-start">{r.nationalite}</td>
                        {colonnes.flatMap(c => [<td key={c+'t'}>{r[c]?.[0] ?? 0}</td>,<td key={c+'f'} className="text-muted">{r[c]?.[1] ?? 0}</td>])}
                        <td className="fw-bold">{r.total[0]}</td><td className="text-muted">{r.total[1]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default StatsGenerales;
