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

const ActivitesEleves = () => {
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
            const va = a[tri.col] ?? -1;
            const vb = b[tri.col] ?? -1;
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

    const totalAbsences = eleves.reduce((s, e) => s + e.absences, 0);
    const totalRetards  = eleves.reduce((s, e) => s + e.retards,  0);
    const avecNotes     = eleves.filter(e => e.moyenne != null);
    const moyGlobale    = avecNotes.length
        ? (avecNotes.reduce((s, e) => s + e.moyenne, 0) / avecNotes.length).toFixed(2)
        : null;

    const labelPeriode = mois ? moisOptions.find(m => m.val === mois)?.label : 'Toutes périodes';

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>

            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-user-graduate me-2 text-primary" />
                    Activités des élèves
                </h4>
                <p className="text-muted small mb-0">Assiduité et résultats par élève et par établissement</p>
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
                    <i className="fas fa-user-graduate fs-1 d-block mb-3 opacity-25" />
                    <p className="mb-0">Sélectionnez un établissement et cliquez sur <strong>Rechercher</strong></p>
                </div>
            )}

            {data && (
                <>
                    {/* KPIs */}
                    <div className="row g-3 mb-4">
                        {[
                            { l: 'Élèves',           v: eleves.length,  c: '#3b82f6', i: 'fas fa-user-graduate' },
                            { l: 'Absences',          v: totalAbsences,  c: '#ef4444', i: 'fas fa-user-times' },
                            { l: 'Retards',           v: totalRetards,   c: '#f59e0b', i: 'fas fa-clock' },
                            { l: 'Moyenne générale',  v: moyGlobale ? `${moyGlobale}/20` : '—', c: '#10b981', i: 'fas fa-graduation-cap' },
                        ].map(x => (
                            <div key={x.l} className="col-6 col-md-3">
                                <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                    <div className="card-body py-3 d-flex align-items-center gap-3">
                                        <div style={{ width: 38, height: 38, borderRadius: 8, background: x.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={x.i} style={{ color: x.c, fontSize: 16 }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>
                                                {typeof x.v === 'number' ? x.v.toLocaleString('fr-FR') : x.v}
                                            </div>
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
                                <i className="fas fa-clipboard-check me-2 text-success" />
                                {data.tenant?.nom} — {labelPeriode}
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
                                                <Th col="nom"      label="Élève" />
                                                <Th col="classe"   label="Classe" />
                                                <Th col="absences" label="Absences" className="text-center" />
                                                <Th col="retards"  label="Retards" className="text-center" />
                                                <Th col="moyenne"  label="Moyenne" className="text-center" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {eleves.map(e => {
                                                const coulMoy = e.moyenne == null ? '#adb5bd'
                                                    : e.moyenne >= 10 ? '#10b981'
                                                    : e.moyenne >= 8  ? '#f59e0b'
                                                    : '#ef4444';
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
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ActivitesEleves;
