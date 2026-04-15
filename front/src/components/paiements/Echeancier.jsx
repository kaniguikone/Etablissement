import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { NavLink } from 'react-router-dom';

const STATUT = {
    retard:  { label: 'En retard',  cls: 'danger',  icon: 'fas fa-exclamation-circle' },
    urgent:  { label: 'Urgent',     cls: 'warning', icon: 'fas fa-clock' },
    a_venir: { label: 'À venir',    cls: 'info',    icon: 'fas fa-calendar' },
};

const fmtDate = (d) => {
    if (!d) return '—';
    const [a, m, j] = d.slice(0, 10).split('-');
    return `${j}/${m}/${a}`;
};

const fmtMontant = (n) =>
    n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—';

const Echeancier = () => {
    const [niveaux, setNiveaux]   = useState([]);
    const [classes, setClasses]   = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [classeId, setClasseId] = useState('');
    const [horizon, setHorizon]   = useState(90);
    const [data, setData]         = useState([]);
    const [meta, setMeta]         = useState(null);
    const [chargement, setChargement] = useState(false);

    useEffect(() => {
        api.get('/niveaux').then(r => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    useEffect(() => {
        if (!niveauId) { setClasses([]); setClasseId(''); return; }
        api.get(`/classesNiveaux/${niveauId}`)
            .then(r => setClasses(r.data))
            .catch(() => setClasses([]));
        setClasseId('');
    }, [niveauId]);

    const charger = useCallback(() => {
        setChargement(true);
        const p = new URLSearchParams({ horizon });
        if (niveauId) p.append('niveau_id', niveauId);
        if (classeId) p.append('classe_id', classeId);

        api.get(`/echeancier?${p}`)
            .then(r => { setData(r.data.data); setMeta(r.data); })
            .catch((err) => console.error('Erreur chargement:', err))
            .finally(() => setChargement(false));
    }, [niveauId, classeId, horizon]);

    useEffect(() => { charger(); }, [charger]);

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-calendar-alt me-2 text-primary" />
                        Échéancier de paiement
                    </h4>
                </div>

                {/* Filtres */}
                <div className="row g-2 mb-3">
                    <div className="col-md-3">
                        <select className="form-select form-select-sm" value={niveauId}
                            onChange={e => setNiveauId(e.target.value)}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map(n => <option key={n.id} value={n.id}>{n.libelle_niveau}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select form-select-sm" value={classeId}
                            onChange={e => setClasseId(e.target.value)}
                            disabled={!niveauId || classes.length === 0}>
                            <option value="">Toutes les classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select form-select-sm" value={horizon}
                            onChange={e => setHorizon(Number(e.target.value))}>
                            <option value={30}>Horizon : 30 jours</option>
                            <option value={60}>Horizon : 60 jours</option>
                            <option value={90}>Horizon : 90 jours</option>
                            <option value={180}>Horizon : 6 mois</option>
                        </select>
                    </div>
                </div>

                {/* Cartes résumé */}
                {meta && (
                    <div className="row g-2 mb-3">
                        <div className="col-6 col-md-3">
                            <div className="card border-danger text-center py-2">
                                <div className="fs-4 fw-bold text-danger">{meta.nb_en_retard}</div>
                                <div className="small text-muted">En retard</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="card border-warning text-center py-2">
                                <div className="fs-4 fw-bold text-warning">{meta.nb_urgent}</div>
                                <div className="small text-muted">Urgents (&le;7j)</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="card border-info text-center py-2">
                                <div className="fs-4 fw-bold text-info">{meta.nb_a_venir}</div>
                                <div className="small text-muted">À venir</div>
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <div className="card border-secondary text-center py-2">
                                <div className="fs-6 fw-bold text-secondary">
                                    {Number(meta.total_solde).toLocaleString('fr-FR')} F
                                </div>
                                <div className="small text-muted">Total impayé</div>
                            </div>
                        </div>
                    </div>
                )}

                {chargement ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : (
                    <table className="table table-sm table-hover table-striped">
                        <thead className="table-light">
                            <tr>
                                <th>Statut</th>
                                <th>Élève</th>
                                <th>Classe</th>
                                <th>Échéance</th>
                                <th>Date limite</th>
                                <th className="text-end">Dû</th>
                                <th className="text-end">Payé</th>
                                <th className="text-end">Solde</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center text-muted py-4">
                                        Aucun impayé dans cet horizon.
                                    </td>
                                </tr>
                            )}
                            {data.map((ligne, i) => {
                                const s = STATUT[ligne.statut] || STATUT.a_venir;
                                const joursLabel = ligne.jours_restants < 0
                                    ? `${Math.abs(ligne.jours_restants)}j de retard`
                                    : `dans ${ligne.jours_restants}j`;
                                return (
                                    <tr key={i} className={ligne.en_retard ? 'table-danger' : (ligne.statut === 'urgent' ? 'table-warning' : '')}>
                                        <td>
                                            <span className={`badge bg-${s.cls}`} style={{ fontSize: 11 }}>
                                                <i className={`${s.icon} me-1`} />{s.label}
                                            </span>
                                            <div className="text-muted" style={{ fontSize: 10 }}>{joursLabel}</div>
                                        </td>
                                        <td>
                                            <span className="fw-semibold">{ligne.nom}</span>
                                            <div className="text-muted" style={{ fontSize: 11 }}>{ligne.matricule}</div>
                                        </td>
                                        <td className="text-muted small">{ligne.classe}</td>
                                        <td>{ligne.libelle}</td>
                                        <td className="text-nowrap">{fmtDate(ligne.date_echeance)}</td>
                                        <td className="text-end text-muted">{fmtMontant(ligne.montant_du)}</td>
                                        <td className="text-end text-success">{fmtMontant(ligne.montant_paye)}</td>
                                        <td className="text-end fw-bold text-danger">{fmtMontant(ligne.solde)}</td>
                                        <td>
                                            <NavLink
                                                to={`/PaiementsEleve/${ligne.eleve_id}`}
                                                className="btn btn-sm btn-outline-primary py-0 px-2"
                                                title="Gérer les paiements"
                                            >
                                                <i className="fas fa-hand-holding-usd" />
                                            </NavLink>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default Echeancier;
