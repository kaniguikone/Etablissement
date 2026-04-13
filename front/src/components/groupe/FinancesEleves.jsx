import { useEffect, useState } from 'react';
import { centralApi } from '../../api/axios';

const fmt  = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const fmtK = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
    return String(Math.round(n));
};

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

const FinancesEleves = () => {
    const [ecoles, setEcoles]       = useState([]);
    const [ecoleId, setEcoleId]     = useState('');
    const [mois, setMois]           = useState('');
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(false);
    const [erreur, setErreur]       = useState('');
    const [onglet, setOnglet]       = useState('finances'); // 'finances' | 'activites'
    const [recherche, setRecherche] = useState('');
    const [tri, setTri]             = useState({ col: 'nom', asc: true });

    const moisOptions = derniersMois();

    useEffect(() => {
        centralApi.get('/group/ecoles')
            .then(r => {
                const actives = r.data.filter(e => e.actif);
                setEcoles(actives);
                if (actives.length > 0) setEcoleId(String(actives[0].id));
            })
            .catch(() => setErreur('Impossible de charger les établissements.'));
    }, []);

    useEffect(() => {
        if (!ecoleId) return;
        setLoading(true);
        setErreur('');
        const params = mois ? `?mois=${mois}` : '';
        centralApi.get(`/group/ecoles/${ecoleId}/eleves${params}`)
            .then(r => setData(r.data))
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    }, [ecoleId, mois]);

    const changerTri = (col) => {
        setTri(t => ({ col, asc: t.col === col ? !t.asc : true }));
    };

    const eleves = (data?.eleves ?? [])
        .filter(e => e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
                     e.classe.toLowerCase().includes(recherche.toLowerCase()))
        .sort((a, b) => {
            const va = a[tri.col] ?? '';
            const vb = b[tri.col] ?? '';
            if (typeof va === 'number' || va === null) return tri.asc ? (va ?? -1) - (vb ?? -1) : (vb ?? -1) - (va ?? -1);
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

    // Totaux
    const totalDu   = eleves.reduce((s, e) => s + e.total_du,   0);
    const totalPaye = eleves.reduce((s, e) => s + e.total_paye, 0);
    const totalReste = eleves.reduce((s, e) => s + e.reste,     0);
    const aJour     = eleves.filter(e => e.a_jour).length;
    const enRetard  = eleves.filter(e => !e.a_jour).length;

    const labelPeriode = mois ? moisOptions.find(m => m.val === mois)?.label : 'Toutes périodes';

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1200 }}>

            {/* En-tête */}
            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-users me-2 text-primary" />
                    Finances & Activités des élèves
                </h4>
                <p className="text-muted small mb-0">Suivi financier et activité individuelle par établissement</p>
            </div>

            {/* Filtres */}
            <div className="d-flex flex-wrap gap-2 mb-4">
                <select className="form-select form-select-sm" style={{ minWidth: 220 }}
                    value={ecoleId} onChange={e => setEcoleId(e.target.value)}>
                    {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
                <select className="form-select form-select-sm" style={{ minWidth: 180 }}
                    value={mois} onChange={e => setMois(e.target.value)}>
                    <option value="">Toutes périodes</option>
                    {moisOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
                <div className="input-group input-group-sm" style={{ minWidth: 200 }}>
                    <span className="input-group-text bg-white border-end-0">
                        <i className="fas fa-search text-muted" style={{ fontSize: 12 }} />
                    </span>
                    <input type="text" className="form-control border-start-0"
                        placeholder="Rechercher un élève…"
                        value={recherche} onChange={e => setRecherche(e.target.value)} />
                </div>
            </div>

            {erreur && <div className="alert alert-danger">{erreur}</div>}

            {loading ? (
                <div className="d-flex justify-content-center py-5">
                    <span className="spinner-border text-primary" />
                </div>
            ) : data && (
                <>
                    {/* Onglets */}
                    <div className="d-flex gap-2 mb-4">
                        <button
                            className="btn btn-sm d-flex align-items-center gap-2"
                            onClick={() => setOnglet('finances')}
                            style={{
                                borderRadius: 8, padding: '6px 16px', fontWeight: onglet === 'finances' ? 600 : 400,
                                backgroundColor: onglet === 'finances' ? '#1e3a8a' : 'transparent',
                                color: onglet === 'finances' ? 'white' : '#6c757d',
                                border: onglet === 'finances' ? 'none' : '1px solid #e5e7eb',
                            }}
                        >
                            <i className="fas fa-wallet" style={{ fontSize: 13 }} />Finances
                        </button>
                        <button
                            className="btn btn-sm d-flex align-items-center gap-2"
                            onClick={() => setOnglet('activites')}
                            style={{
                                borderRadius: 8, padding: '6px 16px', fontWeight: onglet === 'activites' ? 600 : 400,
                                backgroundColor: onglet === 'activites' ? '#1e3a8a' : 'transparent',
                                color: onglet === 'activites' ? 'white' : '#6c757d',
                                border: onglet === 'activites' ? 'none' : '1px solid #e5e7eb',
                            }}
                        >
                            <i className="fas fa-clipboard-check" style={{ fontSize: 13 }} />Activités
                        </button>
                    </div>

                    {/* ── Onglet FINANCES ── */}
                    {onglet === 'finances' && (
                        <>
                            {/* KPIs finances */}
                            <div className="row g-3 mb-4">
                                {[
                                    { l: 'Total dû',    v: fmtK(totalDu)   + ' F', c: '#f59e0b', i: 'fas fa-file-invoice' },
                                    { l: 'Encaissé',    v: fmtK(totalPaye) + ' F', c: '#10b981', i: 'fas fa-money-bill-wave' },
                                    { l: 'Restant',     v: fmtK(totalReste)+ ' F', c: '#ef4444', i: 'fas fa-exclamation-circle' },
                                    { l: 'À jour',      v: `${aJour} / ${enRetard} en retard`, c: '#3b82f6', i: 'fas fa-user-check' },
                                ].map(x => (
                                    <div key={x.l} className="col-6 col-md-3">
                                        <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                            <div className="card-body py-3 d-flex align-items-center gap-3">
                                                <div style={{ width: 38, height: 38, borderRadius: 8, background: x.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={x.i} style={{ color: x.c, fontSize: 16 }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: x.c }}>{x.v}</div>
                                                    <div style={{ fontSize: 11, color: '#6c757d' }}>{x.l}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tableau finances */}
                            <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                                <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                                    <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        <i className="fas fa-wallet me-2 text-warning" />
                                        {data.tenant?.nom} — Finances
                                    </span>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
                                            <thead style={{ backgroundColor: '#f8fafc' }}>
                                                <tr>
                                                    <Th col="nom"        label="Élève" />
                                                    <Th col="classe"     label="Classe" />
                                                    <Th col="total_du"   label="Total dû" className="text-end" />
                                                    <Th col="total_paye" label="Payé" className="text-end" />
                                                    <Th col="reste"      label="Restant" className="text-end" />
                                                    <Th col="a_jour"     label="Statut" className="text-center" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {eleves.map(e => (
                                                    <tr key={e.id}>
                                                        <td className="py-2 align-middle fw-semibold">{e.nom}</td>
                                                        <td className="py-2 align-middle">
                                                            <span className="badge bg-light text-dark border">{e.classe}</span>
                                                        </td>
                                                        <td className="py-2 align-middle text-end text-muted">{fmt(e.total_du)} F</td>
                                                        <td className="py-2 align-middle text-end text-success fw-semibold">{fmt(e.total_paye)} F</td>
                                                        <td className="py-2 align-middle text-end">
                                                            <span style={{ color: e.reste > 0 ? '#dc3545' : '#6c757d', fontWeight: e.reste > 0 ? 700 : 400 }}>
                                                                {fmt(e.reste)} F
                                                            </span>
                                                        </td>
                                                        <td className="py-2 align-middle text-center">
                                                            {e.a_jour
                                                                ? <span className="badge bg-success">À jour</span>
                                                                : <span className="badge bg-danger">En retard</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #dee2e6' }}>
                                                <tr>
                                                    <td colSpan={2} className="py-2 fw-bold text-muted">TOTAL ({eleves.length} élèves)</td>
                                                    <td className="py-2 text-end fw-bold text-muted">{fmtK(totalDu)} F</td>
                                                    <td className="py-2 text-end fw-bold text-success">{fmtK(totalPaye)} F</td>
                                                    <td className="py-2 text-end fw-bold text-danger">{fmtK(totalReste)} F</td>
                                                    <td className="py-2 text-center">
                                                        <span className="badge bg-success me-1">{aJour}</span>
                                                        <span className="badge bg-danger">{enRetard}</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Onglet ACTIVITÉS ── */}
                    {onglet === 'activites' && (
                        <>
                            {/* KPIs activités */}
                            <div className="row g-3 mb-4">
                                {[
                                    { l: 'Élèves',    v: eleves.length,                                   c: '#3b82f6', i: 'fas fa-user-graduate' },
                                    { l: 'Absences',  v: eleves.reduce((s,e) => s + e.absences,  0),      c: '#ef4444', i: 'fas fa-user-times' },
                                    { l: 'Retards',   v: eleves.reduce((s,e) => s + e.retards,   0),      c: '#f59e0b', i: 'fas fa-clock' },
                                    { l: 'Moy. générale', v: (() => {
                                        const notes = eleves.filter(e => e.moyenne != null);
                                        if (!notes.length) return '—';
                                        return (notes.reduce((s,e) => s + e.moyenne, 0) / notes.length).toFixed(2) + '/20';
                                    })(), c: '#10b981', i: 'fas fa-graduation-cap' },
                                ].map(x => (
                                    <div key={x.l} className="col-6 col-md-3">
                                        <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                            <div className="card-body py-3 d-flex align-items-center gap-3">
                                                <div style={{ width: 38, height: 38, borderRadius: 8, background: x.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={x.i} style={{ color: x.c, fontSize: 16 }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>{typeof x.v === 'number' ? x.v.toLocaleString('fr-FR') : x.v}</div>
                                                    <div style={{ fontSize: 11, color: '#6c757d' }}>{x.l}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tableau activités */}
                            <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                                <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                                    <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        <i className="fas fa-clipboard-check me-2 text-success" />
                                        {data.tenant?.nom} — Activités ({labelPeriode})
                                    </span>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
                                            <thead style={{ backgroundColor: '#f8fafc' }}>
                                                <tr>
                                                    <Th col="nom"      label="Élève" />
                                                    <Th col="classe"   label="Classe" />
                                                    <Th col="absences" label="Absences" className="text-center" />
                                                    <Th col="retards"  label="Retards" className="text-center" />
                                                    <Th col="moyenne"  label="Moyenne" className="text-center" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {eleves.map(e => {
                                                    const coulMoy = e.moyenne == null ? '#adb5bd' : e.moyenne >= 10 ? '#10b981' : e.moyenne >= 8 ? '#f59e0b' : '#ef4444';
                                                    return (
                                                        <tr key={e.id}>
                                                            <td className="py-2 align-middle fw-semibold">{e.nom}</td>
                                                            <td className="py-2 align-middle">
                                                                <span className="badge bg-light text-dark border">{e.classe}</span>
                                                            </td>
                                                            <td className="py-2 align-middle text-center">
                                                                <span style={{ fontWeight: 700, color: e.absences > 0 ? '#ef4444' : '#adb5bd' }}>{e.absences}</span>
                                                            </td>
                                                            <td className="py-2 align-middle text-center">
                                                                <span style={{ fontWeight: 700, color: e.retards > 0 ? '#f59e0b' : '#adb5bd' }}>{e.retards}</span>
                                                            </td>
                                                            <td className="py-2 align-middle text-center">
                                                                <span style={{ fontWeight: 700, color: coulMoy }}>
                                                                    {e.moyenne != null ? `${e.moyenne}/20` : '—'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default FinancesEleves;
