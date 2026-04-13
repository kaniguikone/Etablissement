import { useEffect, useState } from 'react';
import { centralApi } from '../../api/axios';

const derniersMois = () => {
    const mois = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        mois.push({
            val:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        });
    }
    return mois;
};

const statutBadge = (statut) => {
    const map = { CDI: 'primary', CDD: 'info', Stagiaire: 'warning', Vacataire: 'secondary' };
    return <span className={`badge bg-${map[statut] || 'secondary'}`} style={{ fontSize: 10 }}>{statut || '—'}</span>;
};

const statutProgBadge = (statut) => {
    const map = { fait: ['success', 'Fait'], en_cours: ['warning', 'En cours'], reporte: ['danger', 'Reporté'] };
    const [c, l] = map[statut] || ['secondary', statut];
    return <span className={`badge bg-${c}`} style={{ fontSize: 10 }}>{l}</span>;
};

// Vue détaillée d'un seul enseignant
const VueDetailProf = ({ ens, labelPeriode }) => (
    <div>
        {/* En-tête prof */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
            <div className="card-body d-flex align-items-center gap-3">
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-chalkboard-teacher text-primary" style={{ fontSize: 22 }} />
                </div>
                <div>
                    <h5 className="fw-bold mb-1">{ens.nom}</h5>
                    <div className="d-flex gap-3 flex-wrap" style={{ fontSize: 13 }}>
                        {statutBadge(ens.statut)}
                        <span className="text-muted"><i className="fas fa-book me-1" />{ens.matieres.join(', ') || '—'}</span>
                        <span className="text-muted"><i className="fas fa-door-open me-1" />{ens.classes.join(', ') || '—'}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* KPIs */}
        <div className="row g-3 mb-4">
            {[
                { l: 'Devoirs créés',       v: ens.nb_devoirs,       c: '#8b5cf6', i: 'fas fa-file-alt' },
                { l: 'Notes saisies',        v: ens.nb_notes,         c: '#10b981', i: 'fas fa-pen' },
                { l: 'Absences signalées',   v: ens.nb_absences,      c: '#ef4444', i: 'fas fa-user-times' },
                { l: 'Séances faites',       v: ens.nb_prog_fait,     c: '#198754', i: 'fas fa-check-circle' },
                { l: 'Séances en cours',     v: ens.nb_prog_en_cours, c: '#f59e0b', i: 'fas fa-spinner' },
                { l: 'Séances reportées',    v: ens.nb_prog_reporte,  c: '#dc3545', i: 'fas fa-times-circle' },
                { l: 'Chapitres couverts',   v: ens.nb_chapitres,     c: '#3b82f6', i: 'fas fa-book-open' },
            ].map(x => (
                <div key={x.l} className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                        <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
                            <i className={x.i} style={{ color: x.c, fontSize: 18, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>{x.v}</div>
                                <div style={{ fontSize: 10, color: '#6c757d' }}>{x.l}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Suivi de programme */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                <span className="fw-semibold" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#198754' }}>
                    <i className="fas fa-tasks me-2" />Suivi de programme — {labelPeriode}
                </span>
            </div>
            <div className="card-body p-0">
                {ens.detail_programme.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <i className="fas fa-book-open fs-3 d-block mb-2 opacity-25" />
                        Aucune progression enregistrée
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc' }}>
                                <tr>
                                    <th className="border-0 fw-semibold text-muted">Matière</th>
                                    <th className="border-0 fw-semibold text-muted">Classe</th>
                                    <th className="border-0 fw-semibold text-muted">Chapitres</th>
                                    <th className="border-0 fw-semibold text-center text-success">Faites</th>
                                    <th className="border-0 fw-semibold text-center text-warning">En cours</th>
                                    <th className="border-0 fw-semibold text-center text-danger">Reportées</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ens.detail_programme.map((d, i) => (
                                    <tr key={i}>
                                        <td className="py-2 align-middle fw-semibold">{d.matiere}</td>
                                        <td className="py-2 align-middle">
                                            <span className="badge bg-light text-dark border">{d.classe}</span>
                                        </td>
                                        <td className="py-2 align-middle" style={{ maxWidth: 250 }}>
                                            <div className="d-flex flex-wrap gap-1">
                                                {d.chapitres.slice(0, 4).map((ch, j) => (
                                                    <span key={j} className="badge bg-light text-dark border" style={{ fontSize: 9 }}>{ch}</span>
                                                ))}
                                                {d.chapitres.length > 4 && (
                                                    <span className="badge bg-secondary" style={{ fontSize: 9 }}>+{d.chapitres.length - 4}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2 align-middle text-center">
                                            <span style={{ fontWeight: 700, color: d.fait > 0 ? '#198754' : '#adb5bd' }}>{d.fait}</span>
                                        </td>
                                        <td className="py-2 align-middle text-center">
                                            <span style={{ fontWeight: 700, color: d.en_cours > 0 ? '#f59e0b' : '#adb5bd' }}>{d.en_cours}</span>
                                        </td>
                                        <td className="py-2 align-middle text-center">
                                            <span style={{ fontWeight: 700, color: d.reporte > 0 ? '#dc3545' : '#adb5bd' }}>{d.reporte}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Vue tableau tous les enseignants
const VueTableau = ({ enseignants, labelPeriode, tenant }) => {
    const [tri, setTri] = useState({ col: 'nom', asc: true });
    const changerTri = (col) => setTri(t => ({ col, asc: t.col === col ? !t.asc : true }));

    const sorted = [...enseignants].sort((a, b) => {
        const va = a[tri.col] ?? '';
        const vb = b[tri.col] ?? '';
        if (typeof va === 'number') return tri.asc ? va - vb : vb - va;
        return tri.asc ? String(va).localeCompare(String(vb), 'fr') : String(vb).localeCompare(String(va), 'fr');
    });

    const Th = ({ col, label, className = '' }) => (
        <th className={`border-0 fw-semibold text-muted ${className}`}
            style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
            onClick={() => changerTri(col)}>
            {label}
            {tri.col === col && <i className={`fas fa-sort-${tri.asc ? 'up' : 'down'} ms-1`} style={{ fontSize: 10 }} />}
        </th>
    );

    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                    {tenant} — {labelPeriode}
                </span>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
                        <thead style={{ backgroundColor: '#f8fafc' }}>
                            <tr>
                                <Th col="nom"              label="Enseignant" />
                                <Th col="statut"           label="Statut" />
                                <th className="border-0 fw-semibold text-muted">Matières / Classes</th>
                                <Th col="nb_devoirs"       label="Devoirs" className="text-center" />
                                <Th col="nb_notes"         label="Notes" className="text-center" />
                                <Th col="nb_absences"      label="Absences" className="text-center" />
                                <Th col="nb_prog_fait"     label="Séances" className="text-center" />
                                <Th col="nb_chapitres"     label="Chapitres" className="text-center" />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(ens => (
                                <tr key={ens.id}>
                                    <td className="py-2 align-middle fw-semibold">{ens.nom}</td>
                                    <td className="py-2 align-middle">{statutBadge(ens.statut)}</td>
                                    <td className="py-2 align-middle" style={{ maxWidth: 200 }}>
                                        <div className="d-flex flex-wrap gap-1">
                                            {ens.matieres.map(m => (
                                                <span key={m} className="badge bg-light text-dark border" style={{ fontSize: 9 }}>{m}</span>
                                            ))}
                                            {ens.classes.map(c => (
                                                <span key={c} className="badge" style={{ fontSize: 9, background: '#dbeafe', color: '#1e3a8a' }}>{c}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-2 align-middle text-center">
                                        <span style={{ fontWeight: 700, color: ens.nb_devoirs > 0 ? '#8b5cf6' : '#adb5bd' }}>{ens.nb_devoirs}</span>
                                    </td>
                                    <td className="py-2 align-middle text-center">
                                        <span style={{ fontWeight: 700, color: ens.nb_notes > 0 ? '#10b981' : '#adb5bd' }}>{ens.nb_notes}</span>
                                    </td>
                                    <td className="py-2 align-middle text-center">
                                        <span style={{ fontWeight: 700, color: ens.nb_absences > 0 ? '#ef4444' : '#adb5bd' }}>{ens.nb_absences}</span>
                                    </td>
                                    <td className="py-2 align-middle text-center">
                                        <div className="d-flex gap-1 justify-content-center flex-wrap">
                                            {ens.nb_prog_fait > 0 && <span className="badge bg-success" style={{ fontSize: 9 }}>{ens.nb_prog_fait} fait</span>}
                                            {ens.nb_prog_en_cours > 0 && <span className="badge bg-warning" style={{ fontSize: 9 }}>{ens.nb_prog_en_cours} cours</span>}
                                            {ens.nb_prog_reporte > 0 && <span className="badge bg-danger" style={{ fontSize: 9 }}>{ens.nb_prog_reporte} rep.</span>}
                                            {ens.nb_prog_fait === 0 && ens.nb_prog_en_cours === 0 && ens.nb_prog_reporte === 0 && <span style={{ color: '#adb5bd' }}>—</span>}
                                        </div>
                                    </td>
                                    <td className="py-2 align-middle text-center">
                                        <span style={{ fontWeight: 700, color: ens.nb_chapitres > 0 ? '#3b82f6' : '#adb5bd' }}>{ens.nb_chapitres || '—'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ActivitesEnseignants = () => {
    const [ecoles, setEcoles]             = useState([]);
    const [ecoleId, setEcoleId]           = useState('');
    const [listeProfs, setListeProfs]     = useState([]);
    const [enseignantId, setEnseignantId] = useState('');
    const [mois, setMois]                 = useState('');
    const [data, setData]                 = useState(null);
    const [loading, setLoading]           = useState(false);
    const [erreur, setErreur]             = useState('');

    const moisOptions = derniersMois();

    // Charger les écoles au montage
    useEffect(() => {
        centralApi.get('/group/ecoles')
            .then(r => {
                const actives = r.data.filter(e => e.actif);
                setEcoles(actives);
                if (actives.length > 0) setEcoleId(String(actives[0].id));
            })
            .catch(() => setErreur('Impossible de charger les établissements.'));
    }, []);

    // Charger la liste légère des profs quand l'école change
    useEffect(() => {
        if (!ecoleId) return;
        setListeProfs([]);
        setEnseignantId('');
        setData(null);
        centralApi.get(`/group/ecoles/${ecoleId}/enseignants/liste`)
            .then(r => setListeProfs(r.data))
            .catch(() => {});
    }, [ecoleId]);

    const charger = () => {
        if (!ecoleId) return;
        setLoading(true);
        setErreur('');
        setData(null);
        const params = new URLSearchParams();
        if (mois) params.set('mois', mois);
        centralApi.get(`/group/ecoles/${ecoleId}/enseignants${params.toString() ? '?' + params : ''}`)
            .then(r => setData(r.data))
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    };

    const labelPeriode = mois ? moisOptions.find(m => m.val === mois)?.label : 'Toutes périodes';

    // Enseignant sélectionné dans les données chargées
    const profSelectionne = (enseignantId && data)
        ? (data.enseignants ?? []).find(e => String(e.id) === enseignantId)
        : null;

    const totalDevoirs   = (data?.enseignants ?? []).reduce((s, e) => s + e.nb_devoirs, 0);
    const totalNotes     = (data?.enseignants ?? []).reduce((s, e) => s + e.nb_notes, 0);
    const totalAbsences  = (data?.enseignants ?? []).reduce((s, e) => s + e.nb_absences, 0);
    const totalSéances   = (data?.enseignants ?? []).reduce((s, e) => s + e.nb_prog_fait + e.nb_prog_en_cours + e.nb_prog_reporte, 0);

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1200 }}>

            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                    Activités des enseignants
                </h4>
                <p className="text-muted small mb-0">Devoirs, notes, absences signalées et suivi de programme</p>
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Établissement</label>
                        <select className="form-select form-select-sm" style={{ minWidth: 220 }}
                            value={ecoleId} onChange={e => handleEcoleChange(e.target.value)}>
                            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Enseignant</label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={enseignantId} onChange={e => setEnseignantId(e.target.value)}
                            disabled={listeProfs.length === 0}>
                            <option value="">Tous les enseignants</option>
                            {listeProfs.map(e => (
                                <option key={e.id} value={String(e.id)}>{e.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Période</label>
                        <select className="form-select form-select-sm" style={{ minWidth: 180 }}
                            value={mois} onChange={e => { setMois(e.target.value); setData(null); setEnseignantId(''); }}>
                            <option value="">Toutes périodes</option>
                            {moisOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        onClick={charger} disabled={!ecoleId || loading}>
                        {loading
                            ? <><span className="spinner-border spinner-border-sm" />Chargement…</>
                            : <><i className="fas fa-search" />Rechercher</>}
                    </button>
                </div>
            </div>

            {erreur && <div className="alert alert-danger">{erreur}</div>}

            {!data && !loading && (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-chalkboard-teacher fs-1 d-block mb-3 opacity-25" />
                    <p className="mb-0">Sélectionnez un établissement et cliquez sur <strong>Rechercher</strong></p>
                </div>
            )}

            {data && (
                <>
                    {/* Bandeau résumé global */}
                    <div className="row g-3 mb-4">
                        {[
                            { l: 'Enseignants',    v: data.enseignants.length, c: '#3b82f6', i: 'fas fa-users' },
                            { l: 'Devoirs créés',  v: totalDevoirs,            c: '#8b5cf6', i: 'fas fa-file-alt' },
                            { l: 'Notes saisies',  v: totalNotes,              c: '#10b981', i: 'fas fa-pen' },
                            { l: 'Abs. signalées', v: totalAbsences,           c: '#ef4444', i: 'fas fa-user-times' },
                            { l: 'Séances totales',v: totalSéances,            c: '#198754', i: 'fas fa-tasks' },
                        ].map(x => (
                            <div key={x.l} className="col-6 col-md">
                                <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                    <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
                                        <i className={x.i} style={{ color: x.c, fontSize: 16, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: x.c }}>{x.v.toLocaleString('fr-FR')}</div>
                                            <div style={{ fontSize: 10, color: '#6c757d' }}>{x.l}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vue détaillée ou tableau */}
                    {profSelectionne
                        ? <VueDetailProf ens={profSelectionne} labelPeriode={labelPeriode} />
                        : <VueTableau enseignants={data.enseignants} labelPeriode={labelPeriode} tenant={data.tenant?.nom} />
                    }
                </>
            )}
        </div>
    );
};

export default ActivitesEnseignants;
