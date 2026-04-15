import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const BADGE = {
    impayé:  { cls: 'bg-danger',           label: 'Impayé' },
    partiel: { cls: 'bg-warning text-dark', label: 'Partiel' },
};

const TableauImpayes = () => {
    const { toast } = useToast();

    const [niveaux, setNiveaux]       = useState([]);
    const [classes, setClasses]       = useState([]);
    const [niveauId, setNiveauId]     = useState('');
    const [classeId, setClasseId]     = useState('');
    const [data, setData]             = useState(null);
    const [chargement, setChargement] = useState(false);
    const abortRef                    = useRef(null);

    useEffect(() => {
        api.get('/niveaux').then(r => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const changerNiveau = async (id) => {
        setNiveauId(id);
        setClasseId('');
        setClasses([]);
        setData(null);
        if (id) {
            try {
                const r = await api.get(`/classesNiveaux/${id}`);
                setClasses(r.data);
            } catch { /* ignore */ }
            charger(id, '');
        }
    };

    const changerClasse = (id) => {
        setClasseId(id);
        charger(niveauId, id);
    };

    const charger = (niv, cls) => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setChargement(true);
        const params = new URLSearchParams();
        if (niv) params.append('niveau_id', niv);
        if (cls) params.append('classe_id', cls);

        api.get(`/impayes?${params}`, { signal: ctrl.signal })
            .then(r => { setData(r.data); setChargement(false); })
            .catch(err => {
                if (err.name !== 'CanceledError') {
                    toast.error('Impossible de charger les impayés.');
                    setChargement(false);
                }
            });
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        if (niveauId) params.append('niveau_id', niveauId);
        if (classeId) params.append('classe_id', classeId);
        window.open(`${api.defaults.baseURL}/paiements/export?${params}`, '_blank');
    };

    const listeEleves = data?.data ?? [];
    const totalImpayes = data?.total_impayes ?? 0;
    const count = data?.count ?? 0;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                {/* En-tête */}
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-exclamation-circle me-2 text-danger" />
                        Tableau des impayés
                    </h4>
                    <div className="d-flex gap-2">
                        {data && listeEleves.length > 0 && (
                            <button className="btn btn-outline-success btn-sm" onClick={exportCsv}>
                                <i className="fas fa-file-csv me-1" />Export CSV
                            </button>
                        )}
                        <NavLink to="/Paiements" className="btn btn-secondary btn-sm">Retour</NavLink>
                    </div>
                </div>

                {/* Filtres */}
                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <select
                            className="form-select form-select-sm"
                            value={niveauId}
                            onChange={e => changerNiveau(e.target.value)}
                        >
                            <option value="">Tous les niveaux</option>
                            {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                    {classes.length > 0 && (
                        <div className="col-md-4">
                            <select
                                className="form-select form-select-sm"
                                value={classeId}
                                onChange={e => changerClasse(e.target.value)}
                            >
                                <option value="">Toutes les classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Indicateur de chargement */}
                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border text-danger" />
                    </div>
                )}

                {/* Résumé */}
                {!chargement && data && (
                    <>
                        <div className="row mb-3">
                            <div className="col-md-4">
                                <div className="card border-danger text-center">
                                    <div className="card-body py-2">
                                        <div className="text-muted small">Élèves avec impayés</div>
                                        <h5 className="mb-0 text-danger">{count}</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger text-center">
                                    <div className="card-body py-2">
                                        <div className="text-muted small">Total impayé</div>
                                        <h5 className="mb-0 text-danger">
                                            {totalImpayes.toLocaleString('fr-FR')} FCFA
                                        </h5>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tableau */}
                        {listeEleves.length === 0 ? (
                            <div className="alert alert-success text-center">
                                <i className="fas fa-check-circle me-2" />
                                Aucun impayé pour les critères sélectionnés.
                            </div>
                        ) : (
                            <table className="table table-striped table-sm table-hover">
                                <thead className="table-danger">
                                    <tr>
                                        <th>#</th>
                                        <th>Matricule</th>
                                        <th>Élève</th>
                                        <th>Classe</th>
                                        <th>Niveau</th>
                                        <th className="text-end">Total dû</th>
                                        <th className="text-end">Total payé</th>
                                        <th className="text-end fw-bold">Solde</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listeEleves.map((r, i) => (
                                        <tr key={r.eleve_id}>
                                            <td>{i + 1}</td>
                                            <td className="text-muted small">{r.matricule}</td>
                                            <td className="fw-bold">{r.nom}</td>
                                            <td>{r.classe}</td>
                                            <td className="text-muted small">{r.niveau}</td>
                                            <td className="text-end">{r.total_du.toLocaleString('fr-FR')}</td>
                                            <td className="text-end text-success">{r.total_paye.toLocaleString('fr-FR')}</td>
                                            <td className="text-end fw-bold text-danger">{r.solde.toLocaleString('fr-FR')}</td>
                                            <td>
                                                <span className={`badge ${BADGE[r.statut]?.cls}`}>
                                                    {BADGE[r.statut]?.label ?? r.statut}
                                                </span>
                                            </td>
                                            <td>
                                                <NavLink
                                                    to={`/PaiementsEleve/${r.eleve_id}`}
                                                    className="btn btn-sm btn-outline-primary"
                                                >
                                                    Gérer
                                                </NavLink>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-light fw-bold">
                                    <tr>
                                        <td colSpan={5} className="text-end">TOTAL</td>
                                        <td className="text-end">
                                            {listeEleves.reduce((s, r) => s + r.total_du, 0).toLocaleString('fr-FR')}
                                        </td>
                                        <td className="text-end text-success">
                                            {listeEleves.reduce((s, r) => s + r.total_paye, 0).toLocaleString('fr-FR')}
                                        </td>
                                        <td className="text-end text-danger">
                                            {totalImpayes.toLocaleString('fr-FR')}
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </>
                )}

                {!chargement && !data && (
                    <div className="text-center text-muted py-5">
                        <i className="fas fa-filter fa-2x mb-2 d-block" />
                        Sélectionnez un niveau pour afficher les impayés.
                    </div>
                )}
            </div>
        </section>
    );
};

export default TableauImpayes;
