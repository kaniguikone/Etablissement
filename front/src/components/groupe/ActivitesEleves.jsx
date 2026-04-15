import { useEffect, useState } from 'react';
import { centralApi } from '../../api/axios';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const fmtK = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
    return String(Math.round(n));
};

const Onglet = ({ label, icone, actif, onClick }) => (
    <button onClick={onClick} style={{
        borderRadius: 8, padding: '7px 16px', fontWeight: actif ? 600 : 400,
        backgroundColor: actif ? '#1e3a8a' : 'transparent',
        color: actif ? 'white' : '#4a5568',
        border: actif ? 'none' : '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        transition: 'all .2s',
    }}>
        <i className={icone} style={{ fontSize: 12 }} />{label}
    </button>
);

// ── Onglet Notes ────────────────────────────────────────────────────────────
const TabNotes = ({ notes }) => {
    if (notes.length === 0) return (
        <div className="text-center text-muted py-5">
            <i className="fas fa-graduation-cap fs-3 d-block mb-2 opacity-25" />
            Aucune note enregistrée pour cette période
        </div>
    );

    const moyGlobale = notes.length
        ? (notes.reduce((s, m) => s + m.moyenne, 0) / notes.length).toFixed(2)
        : null;

    return (
        <div>
            {/* Moyenne globale */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 10, borderLeft: '4px solid #8b5cf6' }}>
                <div className="card-body py-2 d-flex align-items-center gap-3">
                    <i className="fas fa-chart-bar" style={{ color: '#8b5cf6', fontSize: 22, flexShrink: 0 }} />
                    <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>{moyGlobale}/20</div>
                        <div style={{ fontSize: 11, color: '#4a5568' }}>Moyenne générale — {notes.reduce((s, m) => s + m.nb_notes, 0)} note(s)</div>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {notes.map((mat, i) => {
                    const col = mat.moyenne >= 10 ? '#198754' : mat.moyenne >= 8 ? '#f59e0b' : '#dc3545';
                    return (
                        <div key={i} className="col-12 col-xl-6">
                            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">{mat.matiere}</span>
                                        <span style={{ fontSize: 20, fontWeight: 800, color: col }}>{mat.moyenne}/20</span>
                                    </div>
                                    <div style={{ height: 5, background: '#e9ecef', borderRadius: 3, marginTop: 6 }}>
                                        <div style={{ height: '100%', width: `${Math.min(mat.moyenne / 20 * 100, 100)}%`, background: col, borderRadius: 3 }} />
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead style={{ backgroundColor: '#f8fafc' }}>
                                            <tr>
                                                <th className="border-0 fw-semibold text-muted ps-3">Type</th>
                                                <th className="border-0 fw-semibold text-muted text-center" style={{ width: 80 }}>Note</th>
                                                <th className="border-0 fw-semibold text-muted text-end pe-3" style={{ width: 90 }}>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mat.devoirs.map((d, j) => {
                                                const nc = d.note >= 10 ? '#198754' : d.note >= 8 ? '#f59e0b' : '#dc3545';
                                                return (
                                                    <tr key={j}>
                                                        <td className="py-2 align-middle ps-3">
                                                            <span className="badge bg-light text-dark border">{d.type}</span>
                                                        </td>
                                                        <td className="py-2 align-middle text-center fw-bold" style={{ color: nc }}>
                                                            {d.note}/20
                                                        </td>
                                                        <td className="py-2 align-middle text-end pe-3 text-muted" style={{ fontSize: 11 }}>
                                                            {d.date ? new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Onglet Assiduité ─────────────────────────────────────────────────────────
const TabAssiduite = ({ assiduite }) => {
    const totalAbs = assiduite.reduce((s, m) => s + m.absences, 0);
    const totalRet = assiduite.reduce((s, m) => s + m.retards,  0);

    if (assiduite.length === 0) return (
        <div className="text-center text-muted py-5">
            <i className="fas fa-calendar-check fs-3 d-block mb-2 opacity-25" />
            Aucune absence ni retard enregistré
        </div>
    );

    return (
        <div>
            {/* KPIs */}
            <div className="row g-3 mb-4">
                {[
                    { l: 'Total absences', v: totalAbs, c: '#dc3545', i: 'fas fa-user-times' },
                    { l: 'Total retards',  v: totalRet, c: '#f59e0b', i: 'fas fa-clock' },
                ].map(x => (
                    <div key={x.l} className="col-6 col-md-3">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                            <div className="card-body py-2 d-flex align-items-center gap-3">
                                <i className={x.i} style={{ color: x.c, fontSize: 22, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: x.c }}>{x.v}</div>
                                    <div style={{ fontSize: 11, color: '#4a5568' }}>{x.l}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-3">
                {assiduite.map((mat, i) => (
                    <div key={i} className="col-12 col-xl-6">
                        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                            <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                                <span className="fw-bold">{mat.matiere}</span>
                                <div className="d-flex gap-2">
                                    {mat.absences > 0 && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#dc354518', color: '#dc3545', fontWeight: 600, border: '1px solid #dc354540' }}>
                                            {mat.absences} absence{mat.absences > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {mat.retards > 0 && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f59e0b18', color: '#f59e0b', fontWeight: 600, border: '1px solid #f59e0b40' }}>
                                            {mat.retards} retard{mat.retards > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {mat.details.length > 0 && (
                                <div className="card-body p-0">
                                    <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                                        <thead style={{ backgroundColor: '#f8fafc' }}>
                                            <tr>
                                                <th className="border-0 fw-semibold text-muted ps-3">Statut</th>
                                                <th className="border-0 fw-semibold text-muted text-end pe-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mat.details.map((d, j) => {
                                                const col = d.statut === 'absent' ? '#dc3545' : '#f59e0b';
                                                return (
                                                    <tr key={j}>
                                                        <td className="py-2 align-middle ps-3">
                                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: col + '18', color: col, fontWeight: 600, border: `1px solid ${col}40` }}>
                                                                <i className={`fas fa-${d.statut === 'absent' ? 'times' : 'clock'} me-1`} />
                                                                {d.statut === 'absent' ? 'Absence' : 'Retard'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 align-middle text-end pe-3 text-muted" style={{ fontSize: 11 }}>
                                                            {new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Onglet Finances ──────────────────────────────────────────────────────────
const TabFinances = ({ finances }) => {
    const { total_du, total_paye, reste, a_jour, paiements } = finances;
    const taux = total_du > 0 ? Math.round((total_paye / total_du) * 100) : 0;
    const barCol = taux >= 80 ? '#198754' : taux >= 50 ? '#f59e0b' : '#dc3545';

    return (
        <div>
            {/* KPIs */}
            <div className="row g-3 mb-4">
                {[
                    { l: 'Total dû',    v: fmtK(total_du)    + ' F', c: '#f59e0b', i: 'fas fa-file-invoice' },
                    { l: 'Payé',        v: fmtK(total_paye)  + ' F', c: '#198754', i: 'fas fa-money-bill-wave' },
                    { l: 'Restant',     v: fmtK(reste)       + ' F', c: '#dc3545', i: 'fas fa-exclamation-circle' },
                    { l: 'Statut',      v: a_jour ? 'À jour' : 'En retard', c: a_jour ? '#198754' : '#dc3545', i: `fas fa-${a_jour ? 'check' : 'times'}-circle` },
                ].map(x => (
                    <div key={x.l} className="col-6 col-md-3">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                            <div className="card-body py-2 d-flex align-items-center gap-3">
                                <i className={x.i} style={{ color: x.c, fontSize: 22, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>{x.v}</div>
                                    <div style={{ fontSize: 11, color: '#4a5568' }}>{x.l}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Barre de recouvrement */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold">Taux de paiement</span>
                        <span className="fw-bold" style={{ color: barCol }}>{taux}%</span>
                    </div>
                    <div style={{ height: 10, background: '#e9ecef', borderRadius: 5 }}>
                        <div style={{ height: '100%', width: `${taux}%`, background: barCol, borderRadius: 5, transition: 'width .4s' }} />
                    </div>
                    <div className="d-flex justify-content-between mt-1" style={{ fontSize: 11, color: '#4a5568' }}>
                        <span>{fmt(total_paye)} F payé</span>
                        <span>{fmt(total_du)} F attendu</span>
                    </div>
                </div>
            </div>

            {/* Historique paiements */}
            {paiements.length > 0 && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                    <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                        <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                            <i className="fas fa-history me-2 text-success" />
                            Historique des paiements
                        </span>
                    </div>
                    <div className="card-body p-0">
                        <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                            <thead style={{ backgroundColor: '#f8fafc' }}>
                                <tr>
                                    <th className="border-0 fw-semibold text-muted ps-3">Date</th>
                                    <th className="border-0 fw-semibold text-muted text-end pe-3">Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paiements.map((p, i) => (
                                    <tr key={i}>
                                        <td className="py-2 align-middle ps-3 text-muted" style={{ fontSize: 12 }}>
                                            {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="py-2 align-middle text-end pe-3 fw-bold text-success">
                                            {fmt(p.montant)} F
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Composant principal ──────────────────────────────────────────────────────
const ActivitesEleves = () => {
    const [ecoles, setEcoles]             = useState([]);
    const [ecoleId, setEcoleId]           = useState('');
    const [listeClasses, setListeClasses] = useState([]);
    const [listeEleves, setListeEleves]   = useState([]);
    const [listePeriodes, setListePeriodes] = useState([]);
    const [classeId, setClasseId]         = useState('');
    const [eleveId, setEleveId]           = useState('');
    const [periodeId, setPeriodeId]       = useState('');
    const [data, setData]                 = useState(null);
    const [loading, setLoading]           = useState(false);
    const [erreur, setErreur]             = useState('');
    const [onglet, setOnglet]             = useState('notes');

    // Charger les écoles
    useEffect(() => {
        centralApi.get('/group/ecoles')
            .then(r => {
                const actives = r.data.filter(e => e.actif);
                setEcoles(actives);
                if (actives.length > 0) setEcoleId(String(actives[0].id));
            })
            .catch(() => setErreur('Impossible de charger les établissements.'));
    }, []);

    // Quand l'école change → charger classes + élèves + périodes
    useEffect(() => {
        if (!ecoleId) return;
        setListeClasses([]);
        setListeEleves([]);
        setListePeriodes([]);
        setClasseId('');
        setEleveId('');
        setData(null);

        centralApi.get(`/group/ecoles/${ecoleId}/eleves/liste`)
            .then(r => {
                setListeClasses(r.data.classes ?? []);
                setListeEleves(r.data.eleves ?? []);
                setListePeriodes(r.data.periodes ?? []);
            })
            .catch(() => {});
    }, [ecoleId]);

    // Élèves filtrés selon la classe sélectionnée
    const elevesFiltres = classeId
        ? listeEleves.filter(e => String(e.classe_id) === classeId)
        : listeEleves;

    const handleClasseChange = (cid) => {
        setClasseId(cid);
        setEleveId('');
        setData(null);
    };

    const charger = () => {
        if (!ecoleId || !eleveId) return;
        setLoading(true);
        setErreur('');
        setData(null);
        const params = periodeId ? `?periode_id=${periodeId}` : '';
        centralApi.get(`/group/ecoles/${ecoleId}/eleves/${eleveId}/detail${params}`)
            .then(r => { setData(r.data); setOnglet('notes'); })
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    };

    const labelPeriode = periodeId
        ? (listePeriodes.find(p => String(p.id) === periodeId)?.libelle_periode ?? 'Période sélectionnée')
        : 'Toutes périodes';

    return (
        <div className="container-fluid py-4">

            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-user-graduate me-2 text-primary" />
                    Activités des élèves
                </h4>
                <p className="text-muted small mb-0">Notes, assiduité et finances par élève et par établissement</p>
            </div>

            {/* Filtres en cascade */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-school me-1" />Établissement
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={ecoleId} onChange={e => { setEcoleId(e.target.value); setData(null); }}>
                            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-chalkboard me-1" />Classe
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 140 }}
                            value={classeId} onChange={e => handleClasseChange(e.target.value)}
                            disabled={listeClasses.length === 0}>
                            <option value="">Toutes</option>
                            {listeClasses.map(c => <option key={c.id} value={c.id}>{c.abbr_classe}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-user me-1" />Élève <span className="text-danger">*</span>
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 220 }}
                            value={eleveId} onChange={e => { setEleveId(e.target.value); setData(null); }}
                            disabled={listeEleves.length === 0}>
                            <option value="">Sélectionner…</option>
                            {elevesFiltres.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-calendar-alt me-1" />Trimestre / Période
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={periodeId} onChange={e => { setPeriodeId(e.target.value); setData(null); }}
                            disabled={listePeriodes.length === 0}>
                            <option value="">Toutes périodes</option>
                            {listePeriodes.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.libelle_periode} {p.annee ? `(${p.annee})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        onClick={charger} disabled={!eleveId || loading}>
                        {loading
                            ? <><span className="spinner-border spinner-border-sm" />Chargement…</>
                            : <><i className="fas fa-search" />Voir le profil</>}
                    </button>
                </div>
            </div>

            {erreur && <div className="alert alert-danger">{erreur}</div>}

            {!data && !loading && (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-user-graduate fs-1 d-block mb-3 opacity-25" />
                    <p className="mb-0">Sélectionnez un établissement et un élève</p>
                </div>
            )}

            {data && (
                <>
                    {/* En-tête élève */}
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
                        <div className="card-body d-flex align-items-center gap-3">
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-user-graduate text-primary" style={{ fontSize: 22 }} />
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="fw-bold mb-1">{data.eleve.nom}</h5>
                                <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: 12 }}>
                                    <span className="badge bg-light text-dark border">{data.eleve.abbr_classe}</span>
                                    <span className="text-muted">{data.eleve.nom_classe}</span>
                                    <span className="text-muted">Période : {labelPeriode}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Onglets */}
                    <div className="d-flex gap-2 mb-4">
                        <Onglet label="Notes"      icone="fas fa-graduation-cap" actif={onglet === 'notes'}     onClick={() => setOnglet('notes')} />
                        <Onglet label="Assiduité"  icone="fas fa-calendar-check" actif={onglet === 'assiduite'} onClick={() => setOnglet('assiduite')} />
                        <Onglet label="Finances"   icone="fas fa-wallet"         actif={onglet === 'finances'}  onClick={() => setOnglet('finances')} />
                    </div>

                    {onglet === 'notes'     && <TabNotes     notes={data.notes} />}
                    {onglet === 'assiduite' && <TabAssiduite assiduite={data.assiduite} />}
                    {onglet === 'finances'  && <TabFinances  finances={data.finances} />}
                </>
            )}
        </div>
    );
};

export default ActivitesEleves;
