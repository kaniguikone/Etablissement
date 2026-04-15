import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = {
    fait:     { label: 'Fait',     couleur: 'success', icone: '✅' },
    en_cours: { label: 'En cours', couleur: 'warning', icone: '🔄' },
    reporte:  { label: 'Reporté',  couleur: 'danger',  icone: '⏸' },
};

const BadgeStatut = ({ statut }) => {
    if (!statut) return <span className="badge bg-secondary">Non abordé</span>;
    const s = STATUTS[statut];
    return <span className={`badge bg-${s.couleur}`}>{s.icone} {s.label}</span>;
};

const SuiviProgressions = () => {
    const { toast } = useToast();

    const [matieres, setMatieres]       = useState([]);
    const [periodes, setPeriodes]       = useState([]);
    const [matiereId, setMatiereId]     = useState('');
    const [periodeId, setPeriodeId]     = useState('');
    const [chapitres, setChapitres]     = useState([]);
    const [parClasse, setParClasse]     = useState([]);
    const [chargement, setChargement]   = useState(false);
    const [detailClasse, setDetailClasse] = useState(null); // classeId sélectionnée pour voir le détail

    useEffect(() => {
        api.get('/matieres').then((r) => setMatieres(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((r) => setPeriodes(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    useEffect(() => {
        if (!matiereId) { setChapitres([]); setParClasse([]); return; }
        charger();
    }, [matiereId, periodeId]);

    const charger = () => {
        setChargement(true);
        setDetailClasse(null);
        const params = periodeId ? `?periode_id=${periodeId}` : '';
        api.get(`/progressionMatiere/${matiereId}${params}`)
            .then((r) => {
                setChapitres(r.data.chapitres);
                setParClasse(r.data.par_classe);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les progressions.'); setChargement(false); });
    };

    const matiereSelectionnee = matieres.find((m) => String(m.id) === String(matiereId));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Suivi des progressions</h4>
                </div>

                {/* Filtres */}
                <div className="d-flex gap-3 mb-3 flex-wrap align-items-end">
                    <div>
                        <label className="form-label mb-1">Matière</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 220 }}
                            value={matiereId}
                            onChange={(e) => setMatiereId(e.target.value)}
                        >
                            <option value="">Sélectionner</option>
                            {matieres.map((m) => (
                                <option key={m.id} value={m.id}>{m.libelle_matiere}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1">Période</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 180 }}
                            value={periodeId}
                            onChange={(e) => setPeriodeId(e.target.value)}
                        >
                            <option value="">Toutes</option>
                            {periodes.map((p) => (
                                <option key={p.id} value={p.id}>{p.libelle_periode}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" />
                    </div>
                )}

                {!chargement && matiereId && parClasse.length === 0 && (
                    <p className="text-muted">Aucune progression déclarée pour {matiereSelectionnee?.libelle_matiere}.</p>
                )}

                {!chargement && parClasse.length > 0 && (
                    <>
                        <h6 className="text-muted mb-3">
                            {matiereSelectionnee?.libelle_matiere} — {chapitres.length} chapitres au programme
                        </h6>

                        {/* Tableau synthèse par classe */}
                        <div className="table-responsive mb-4">
                            <table className="table table-sm table-bordered text-center" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-dark">
                                    <tr>
                                        <th className="text-start">Classe</th>
                                        <th className="text-start">Enseignant</th>
                                        <th>Faits</th>
                                        <th>En cours</th>
                                        <th>Reportés</th>
                                        <th>Non abordés</th>
                                        <th style={{ width: 140 }}>Avancement</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parClasse.map((c) => (
                                        <tr key={c.classe_id} className={detailClasse === c.classe_id ? 'table-active' : ''}>
                                            <td className="text-start fw-bold">{c.nom_classe}</td>
                                            <td className="text-start text-muted">{c.enseignant || '—'}</td>
                                            <td><span className="badge bg-success">{c.faits}</span></td>
                                            <td><span className="badge bg-warning text-dark">{c.en_cours}</span></td>
                                            <td><span className="badge bg-danger">{c.reportes}</span></td>
                                            <td><span className="badge bg-secondary">{c.non_abordes}</span></td>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="flex-grow-1" style={{ height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${c.taux}%`,
                                                            backgroundColor: c.taux >= 80 ? '#10b981' : c.taux >= 50 ? '#f59e0b' : '#ef4444',
                                                            borderRadius: 4,
                                                            transition: 'width 0.8s ease',
                                                        }} />
                                                    </div>
                                                    <small className="text-muted fw-bold">{c.taux}%</small>
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-primary btn-sm py-0"
                                                    onClick={() => setDetailClasse(detailClasse === c.classe_id ? null : c.classe_id)}
                                                >
                                                    {detailClasse === c.classe_id ? 'Fermer' : 'Détail'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Détail chapitre par chapitre pour la classe sélectionnée */}
                        {detailClasse && (() => {
                            const classeData = parClasse.find((c) => c.classe_id === detailClasse);
                            if (!classeData) return null;
                            return (
                                <div className="border rounded p-3 mb-3">
                                    <h6 className="mb-3">
                                        Détail — {classeData.nom_classe}
                                        {classeData.enseignant && <span className="text-muted fw-normal ms-2">({classeData.enseignant})</span>}
                                    </h6>
                                    <table className="table table-sm table-bordered" style={{ fontSize: '0.85rem' }}>
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: 40 }}>#</th>
                                                <th>Chapitre</th>
                                                <th style={{ width: 120 }}>Statut</th>
                                                <th style={{ width: 110 }}>Date</th>
                                                <th>Observations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {chapitres.map((ch) => {
                                                const prog = classeData.details?.[ch.id];
                                                return (
                                                    <tr key={ch.id}>
                                                        <td className="text-center text-muted">{ch.ordre}</td>
                                                        <td>
                                                            {ch.titre}
                                                            {ch.note_direction && (
                                                                <div className="text-info small">📌 {ch.note_direction}</div>
                                                            )}
                                                        </td>
                                                        <td><BadgeStatut statut={prog?.statut} /></td>
                                                        <td className="text-muted small">{prog?.date_seance || '—'}</td>
                                                        <td className="text-muted small">{prog?.observations || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>
        </section>
    );
};

export default SuiviProgressions;
