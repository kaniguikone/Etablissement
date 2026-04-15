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

const FinancesGroupe = () => {
    const [ecoles, setEcoles]       = useState([]);
    const [ecoleId, setEcoleId]     = useState('');
    const [mois, setMois]           = useState('');
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(false);
    const [erreur, setErreur]       = useState('');
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

    const charger = () => {
        if (!ecoleId) return;
        setLoading(true);
        setErreur('');
        setData(null);
        const params = mois ? `?mois=${mois}` : '';
        centralApi.get(`/group/ecoles/${ecoleId}/eleves${params}`)
            .then(r => setData(r.data))
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    };

    const changerTri = (col) => setTri(t => ({ col, asc: t.col === col ? !t.asc : true }));

    const eleves = (data?.eleves ?? [])
        .filter(e => e.nom.toLowerCase().includes(recherche.toLowerCase()) ||
                     e.classe.toLowerCase().includes(recherche.toLowerCase()))
        .sort((a, b) => {
            const va = a[tri.col] ?? 0;
            const vb = b[tri.col] ?? 0;
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

    const totalDu    = eleves.reduce((s, e) => s + e.total_du,   0);
    const totalPaye  = eleves.reduce((s, e) => s + e.total_paye, 0);
    const totalReste = eleves.reduce((s, e) => s + e.reste,      0);
    const aJour      = eleves.filter(e => e.a_jour).length;
    const enRetard   = eleves.filter(e => !e.a_jour).length;

    return (
        <div className="container-fluid py-4">

            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-wallet me-2 text-warning" />
                    Finances des élèves
                </h4>
                <p className="text-muted small mb-0">Suivi des paiements par élève et par établissement</p>
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Établissement</label>
                        <select className="form-select form-select-sm" style={{ minWidth: 220 }}
                            value={ecoleId} onChange={e => { setEcoleId(e.target.value); setData(null); }}>
                            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Période</label>
                        <select className="form-select form-select-sm" style={{ minWidth: 180 }}
                            value={mois} onChange={e => { setMois(e.target.value); setData(null); }}>
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
                    <i className="fas fa-wallet fs-1 d-block mb-3 opacity-25" />
                    <p className="mb-0">Sélectionnez un établissement et cliquez sur <strong>Rechercher</strong></p>
                </div>
            )}

            {data && (
                <>
                    {/* KPIs */}
                    <div className="row g-3 mb-4">
                        {[
                            { l: 'Total dû',           v: fmtK(totalDu)    + ' F', c: '#f59e0b', i: 'fas fa-file-invoice' },
                            { l: 'Encaissé',           v: fmtK(totalPaye)  + ' F', c: '#10b981', i: 'fas fa-money-bill-wave' },
                            { l: 'Restant dû',         v: fmtK(totalReste) + ' F', c: '#ef4444', i: 'fas fa-exclamation-circle' },
                            { l: 'À jour / En retard', v: `${aJour} / ${enRetard}`, c: '#3b82f6', i: 'fas fa-user-check' },
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

                    {/* Filtre local + tableau */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                        <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                            <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                <i className="fas fa-wallet me-2 text-warning" />
                                {data.tenant?.nom} — {eleves.length} élève(s)
                            </span>
                            <div className="input-group input-group-sm" style={{ maxWidth: 200 }}>
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted" style={{ fontSize: 11 }} />
                                </span>
                                <input type="text" className="form-control border-start-0"
                                    placeholder="Filtrer…" value={recherche}
                                    onChange={e => setRecherche(e.target.value)} />
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {eleves.length === 0 ? (
                                <div className="text-center text-muted py-5">
                                    <i className="fas fa-user-slash fs-3 d-block mb-2 opacity-25" />
                                    Aucun élève trouvé
                                </div>
                            ) : (
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
                                                    <td className="py-2 align-middle text-end fw-semibold text-success">{fmt(e.total_paye)} F</td>
                                                    <td className="py-2 align-middle text-end">
                                                        <span style={{ color: e.reste > 0 ? '#dc3545' : '#6c757d', fontWeight: e.reste > 0 ? 700 : 400 }}>
                                                            {fmt(e.reste)} F
                                                        </span>
                                                    </td>
                                                    <td className="py-2 align-middle text-center">
                                                        {e.a_jour
                                                            ? <span className="badge bg-success">À jour</span>
                                                            : <span className="badge bg-danger">En retard</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #dee2e6' }}>
                                            <tr>
                                                <td colSpan={2} className="py-2 fw-bold text-muted">TOTAL ({eleves.length})</td>
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
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FinancesGroupe;
