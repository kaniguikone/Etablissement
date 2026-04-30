import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = {
    conforme:     { label: 'Conforme',     badge: 'success', icone: '✅' },
    partiel:      { label: 'Partiel',      badge: 'warning', icone: '⚠️' },
    insuffisant:  { label: 'Insuffisant',  badge: 'danger',  icone: '❌' },
    non_defini:   { label: 'Non défini',   badge: 'secondary', icone: '—' },
};

const BadgeStatut = ({ statut }) => {
    const s = STATUTS[statut] ?? STATUTS.non_defini;
    return <span className={`badge bg-${s.badge}`}>{s.icone} {s.label}</span>;
};

const BarreProgression = ({ taux }) => {
    if (taux === null) return <span className="text-muted small">—</span>;
    const couleur = taux >= 90 ? '#10b981' : taux >= 60 ? '#f59e0b' : '#ef4444';
    return (
        <div className="d-flex align-items-center gap-2">
            <div className="flex-grow-1" style={{ height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(taux, 100)}%`, backgroundColor: couleur, borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <small className="fw-bold" style={{ color: couleur, minWidth: 36 }}>{taux}%</small>
        </div>
    );
};

const ConformiteEdt = () => {
    const { toast } = useToast();

    const [niveaux,  setNiveaux]  = useState([]);
    const [classes,  setClasses]  = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [classeId, setClasseId] = useState('');
    const [donnees,  setDonnees]  = useState([]);
    const [chargement, setChargement] = useState(false);
    const [detailId,   setDetailId]   = useState(null);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    useEffect(() => {
        if (!niveauId) { setClasses([]); setClasseId(''); return; }
        api.get(`/classesNiveaux/${niveauId}`).then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, [niveauId]);

    useEffect(() => {
        charger();
    }, [niveauId, classeId]);

    const charger = () => {
        if (!niveauId && !classeId) { setDonnees([]); return; }
        setChargement(true);
        const params = new URLSearchParams();
        if (classeId) params.append('classe_id', classeId);
        else if (niveauId) params.append('niveau_id', niveauId);
        api.get(`/volumesHoraires/conformite?${params}`)
            .then((r) => { setDonnees(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les données.'); setChargement(false); });
    };

    // Statistiques globales
    const nbConformes   = donnees.filter((d) => d.statut === 'conforme').length;
    const nbPartiels    = donnees.filter((d) => d.statut === 'partiel').length;
    const nbInsuffisants= donnees.filter((d) => d.statut === 'insuffisant').length;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Conformité EDT / Volumes horaires</h4>
                </div>

                {/* Filtres */}
                <div className="d-flex gap-3 mb-3 flex-wrap align-items-end">
                    <div>
                        <label className="form-label mb-1">Niveau</label>
                        <select className="form-select form-select-sm" style={{ width: 200 }}
                            value={niveauId} onChange={(e) => { setNiveauId(e.target.value); setClasseId(''); }}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1">Classe</label>
                        <select className="form-select form-select-sm" style={{ width: 180 }}
                            value={classeId} onChange={(e) => setClasseId(e.target.value)} disabled={!niveauId}>
                            <option value="">Toutes</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                </div>

                {chargement && <div className="text-center py-3"><div className="spinner-border text-primary" /></div>}

                {!chargement && donnees.length > 0 && (
                    <>
                        {/* Résumé */}
                        <div className="d-flex gap-3 mb-3 flex-wrap">
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 100 }}>
                                <div className="fs-4 fw-bold text-success">{nbConformes}</div>
                                <div className="small text-muted">Conformes</div>
                            </div>
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 100 }}>
                                <div className="fs-4 fw-bold text-warning">{nbPartiels}</div>
                                <div className="small text-muted">Partiels</div>
                            </div>
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 100 }}>
                                <div className="fs-4 fw-bold text-danger">{nbInsuffisants}</div>
                                <div className="small text-muted">Insuffisants</div>
                            </div>
                        </div>

                        {/* Tableau par classe */}
                        <div className="table-responsive mb-4">
                            <table className="table table-sm table-bordered" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-dark">
                                    <tr>
                                        <th>Classe</th>
                                        <th>Niveau</th>
                                        <th style={{ width: 180 }}>Avancement global</th>
                                        <th style={{ width: 120 }}>Statut</th>
                                        <th style={{ width: 80 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donnees.map((d) => (
                                        <>
                                            <tr key={d.classe_id} className={detailId === d.classe_id ? 'table-active' : ''}>
                                                <td className="fw-bold">{d.nom_classe}</td>
                                                <td className="text-muted">{d.niveau}</td>
                                                <td><BarreProgression taux={d.taux_global} /></td>
                                                <td><BadgeStatut statut={d.statut} /></td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-outline-primary btn-sm py-0"
                                                        onClick={() => setDetailId(detailId === d.classe_id ? null : d.classe_id)}
                                                    >
                                                        {detailId === d.classe_id ? 'Fermer' : 'Détail'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {detailId === d.classe_id && (
                                                <tr key={`detail-${d.classe_id}`}>
                                                    <td colSpan={5} className="p-0">
                                                        <div className="p-3 bg-light">
                                                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.83rem' }}>
                                                                <thead className="table-secondary">
                                                                    <tr>
                                                                        <th>Matière</th>
                                                                        <th className="text-center">Prévu/sem.</th>
                                                                        <th className="text-center">Placé/sem.</th>
                                                                        <th style={{ width: 160 }}>Avancement</th>
                                                                        <th className="text-center">Statut</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {d.matieres.map((m) => (
                                                                        <tr key={m.matiere_id}>
                                                                            <td className="fw-bold">{m.matiere}</td>
                                                                            <td className="text-center">{m.heures_prevues}h</td>
                                                                            <td className="text-center">
                                                                                {m.heures_placees}h
                                                                                {m.heures_placees > m.heures_prevues && (
                                                                                    <span className="text-danger ms-1 small">+{(m.heures_placees - m.heures_prevues).toFixed(1)}h</span>
                                                                                )}
                                                                            </td>
                                                                            <td><BarreProgression taux={m.taux} /></td>
                                                                            <td className="text-center"><BadgeStatut statut={m.statut} /></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!chargement && donnees.length === 0 && (niveauId || classeId) && (
                    <p className="text-muted">Aucune donnée — vérifiez que des volumes horaires sont définis pour ce niveau.</p>
                )}
            </div>
        </section>
    );
};

export default ConformiteEdt;
