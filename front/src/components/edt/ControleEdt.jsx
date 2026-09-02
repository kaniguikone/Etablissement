import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

/**
 * Contrôle qualité d'un emploi du temps contre les règles MENET
 * (chantier EDT — Lot 1).
 */
const ControleEdt = () => {
    const { toast } = useToast();

    const [niveaux, setNiveaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [classeId, setClasseId] = useState('');

    const [rapport, setRapport] = useState(null);
    const [chargement, setChargement] = useState(false);

    const [contraintes, setContraintes] = useState([]);
    const [reglesOuvertes, setReglesOuvertes] = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement.'));
        api.get('/edt/contraintes').then((r) => setContraintes(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setClasses([]);
        setClasseId('');
        if (!niveauId) return;
        api.get(`/classesNiveaux/${niveauId}`).then((r) => setClasses(r.data)).catch(() => {});
    }, [niveauId]);

    const lancer = () => {
        setChargement(true);
        api.get('/edt/controle', { params: { niveau_id: niveauId || undefined, classe_id: classeId || undefined } })
            .then((r) => setRapport(r.data))
            .catch(() => toast.error("Impossible de contrôler l'emploi du temps."))
            .finally(() => setChargement(false));
    };

    const majContrainte = (code, patch) => {
        api.put(`/edt/contraintes/${code}`, patch)
            .then((r) => setContraintes((cs) => cs.map((c) => (c.code === code ? r.data : c))))
            .catch(() => toast.error('Modification impossible.'));
    };

    const dures = rapport?.violations.filter((v) => v.nature === 'dure') || [];
    const souples = rapport?.violations.filter((v) => v.nature === 'souple') || [];

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Contrôle de l&apos;emploi du temps</h4>
                </div>
                <p className="text-muted small">
                    Vérifie l&apos;emploi du temps actuel contre les règles de confection MENET :
                    conflits, salles spécialisées, EPS hors heures chaudes, heures consécutives,
                    volumes horaires, indisponibilités, équilibre de la semaine…
                </p>

                <div className="d-flex align-items-end gap-3 mb-3 flex-wrap">
                    <div>
                        <label className="form-label mb-1 small">Niveau</label>
                        <select className="form-select form-select-sm" style={{ width: 160 }}
                            value={niveauId} onChange={(e) => setNiveauId(e.target.value)}>
                            <option value="">Tous</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1 small">Classe</label>
                        <select className="form-select form-select-sm" style={{ width: 180 }}
                            value={classeId} onChange={(e) => setClasseId(e.target.value)} disabled={!niveauId}>
                            <option value="">Toutes</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={lancer} disabled={chargement}>
                        {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                        Contrôler
                    </button>
                </div>

                {rapport && (
                    <>
                        <div className="d-flex gap-3 flex-wrap mb-3">
                            <div className="border rounded p-2 text-center" style={{ minWidth: 120 }}>
                                <div className="fs-4 fw-bold">{rapport.nb_creneaux}</div>
                                <div className="small text-muted">créneaux</div>
                            </div>
                            <div className={`border rounded p-2 text-center ${rapport.nb_dures ? 'border-danger text-danger' : 'border-success text-success'}`} style={{ minWidth: 120 }}>
                                <div className="fs-4 fw-bold">{rapport.nb_dures}</div>
                                <div className="small">violations bloquantes</div>
                            </div>
                            <div className="border rounded p-2 text-center" style={{ minWidth: 120 }}>
                                <div className="fs-4 fw-bold text-warning">{rapport.nb_souples}</div>
                                <div className="small text-muted">points d&apos;amélioration</div>
                            </div>
                            <div className="border rounded p-2 text-center" style={{ minWidth: 120 }}>
                                <div className="fs-4 fw-bold">{rapport.score}</div>
                                <div className="small text-muted">score (plus bas = mieux)</div>
                            </div>
                        </div>

                        {rapport.nb_creneaux === 0 && (
                            <div className="alert alert-info">Aucun créneau à contrôler pour cette sélection.</div>
                        )}

                        {dures.length > 0 && (
                            <>
                                <h6 className="text-danger">Violations bloquantes</h6>
                                <ul className="list-group mb-3">
                                    {dures.map((v, i) => (
                                        <li key={i} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                                            <span><span className="badge bg-danger me-2">{v.libelle}</span>{v.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {souples.length > 0 && (
                            <>
                                <h6 className="text-warning-emphasis">Points d&apos;amélioration</h6>
                                <ul className="list-group mb-3">
                                    {souples.map((v, i) => (
                                        <li key={i} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                                            <span><span className="badge bg-warning text-dark me-2">{v.libelle}</span>{v.message}</span>
                                            <span className="badge bg-light text-muted">poids {v.poids}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {rapport.nb_creneaux > 0 && rapport.violations.length === 0 && (
                            <div className="alert alert-success">Aucune anomalie détectée. 🎉</div>
                        )}
                    </>
                )}

                {/* Réglage des contraintes */}
                <button className="btn btn-link btn-sm p-0" onClick={() => setReglesOuvertes((o) => !o)}>
                    {reglesOuvertes ? '▾' : '▸'} Régler les contraintes ({contraintes.length})
                </button>
                {reglesOuvertes && (
                    <table className="table table-sm table-bordered mt-2" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light">
                            <tr><th>Contrainte</th><th style={{ width: 90 }}>Nature</th><th style={{ width: 90 }}>Active</th><th style={{ width: 110 }}>Poids</th></tr>
                        </thead>
                        <tbody>
                            {contraintes.map((c) => (
                                <tr key={c.code}>
                                    <td>{c.libelle}</td>
                                    <td>
                                        <span className={`badge ${c.nature === 'dure' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                            {c.nature === 'dure' ? 'Bloquante' : 'Souple'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <input type="checkbox" className="form-check-input" checked={c.active}
                                            disabled={c.nature === 'dure'}
                                            onChange={(e) => majContrainte(c.code, { active: e.target.checked })} />
                                    </td>
                                    <td>
                                        {c.nature === 'souple' ? (
                                            <input type="number" min="0" max="1000" className="form-control form-control-sm"
                                                value={c.poids}
                                                onChange={(e) => setContraintes((cs) => cs.map((x) => x.code === c.code ? { ...x, poids: Number(e.target.value) } : x))}
                                                onBlur={(e) => majContrainte(c.code, { poids: Number(e.target.value) })} />
                                        ) : <span className="text-muted">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default ControleEdt;
