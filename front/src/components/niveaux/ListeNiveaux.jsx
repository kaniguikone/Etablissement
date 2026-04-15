import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import api from "../../api/axios";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeNiveaux = () => {
    const { toast }    = useToast();
    const { confirmer} = useConfirm();
    const location     = useLocation();
    const [niveaux,    setNiveaux]    = useState([]);
    const [recherche,  setRecherche]  = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        listerNiveaux();
    }, [location.key]);

    const listerNiveaux = () => {
        setChargement(true);
        api.get('/niveaux')
            .then((res) => { setNiveaux(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les niveaux.'); setChargement(false); });
    };

    const supprimerNiveau = async (id, nom) => {
        if (!await confirmer(`Supprimer le niveau "${nom}" ?`)) return;
        api.delete(`/niveaux/${id}`)
            .then(() => { toast.success('Niveau supprimé.'); listerNiveaux(); })
            .catch((err) => toast.error(err.response?.data?.message || 'Impossible de supprimer ce niveau.'));
    };

    const niveauxFiltres = niveaux.filter(n =>
        n.nom_niveau.toLowerCase().includes(recherche.toLowerCase()) ||
        n.abbr_niveau.toLowerCase().includes(recherche.toLowerCase())
    );

    const totalClasses = niveaux.reduce((s, n) => s + (n.classes_count ?? 0), 0);
    const totalEleves  = niveaux.reduce((s, n) => s + (n.nb_eleves ?? 0), 0);

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">

                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-layer-group me-2 text-primary" />
                        Niveaux
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{niveaux.length}</span>
                    </h4>
                    <NavLink to="/NouveauNiveau" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouveau niveau
                    </NavLink>
                </div>

                {/* Totaux */}
                {!chargement && niveaux.length > 0 && (
                    <div className="row g-2 mb-3">
                        <div className="col-auto">
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2" style={{ fontSize: 13 }}>
                                <i className="fas fa-school me-1" />{totalClasses} classe(s)
                            </span>
                        </div>
                        <div className="col-auto">
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2" style={{ fontSize: 13 }}>
                                <i className="fas fa-user-graduate me-1" />{totalEleves} élève(s)
                            </span>
                        </div>
                    </div>
                )}

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom ou abréviation…"
                            value={recherche}
                            onChange={e => setRecherche(e.target.value)}
                        />
                    </div>
                </div>

                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement…</span>
                        </div>
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: 50 }}>Ordre</th>
                                <th>Nom</th>
                                <th>Abréviation</th>
                                <th className="text-center">Classes</th>
                                <th className="text-center">Élèves</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {niveauxFiltres.length === 0 && (
                                <tr><td colSpan={6} className="text-center text-muted py-3">Aucun niveau trouvé.</td></tr>
                            )}
                            {niveauxFiltres.map((niveau) => (
                                <tr key={niveau.id}>
                                    <td className="text-center text-muted" style={{ fontSize: 13 }}>
                                        {niveau.ordre ?? '—'}
                                    </td>
                                    <td className="fw-semibold">{niveau.nom_niveau}</td>
                                    <td>
                                        <span className="badge bg-light text-dark border">{niveau.abbr_niveau}</span>
                                    </td>
                                    <td className="text-center">
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                            {niveau.classes_count ?? 0}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                                            {niveau.nb_eleves ?? 0}
                                        </span>
                                    </td>
                                    <td>
                                        <NavLink to={`/DetailsNiveau/${niveau.id}`} className="btn btn-primary btn-sm me-1">
                                            <i className="fas fa-pen me-1" />Modifier
                                        </NavLink>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => supprimerNiveau(niveau.id, niveau.nom_niveau)}
                                            disabled={(niveau.classes_count ?? 0) > 0}
                                            title={(niveau.classes_count ?? 0) > 0 ? 'Des classes sont rattachées à ce niveau' : ''}
                                        >
                                            <i className="fas fa-trash me-1" />Supprimer
                                        </button>
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

export default ListeNiveaux;
