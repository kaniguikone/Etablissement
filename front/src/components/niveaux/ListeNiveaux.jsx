import React, { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import api from "../../api/axios";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeNiveaux = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [niveaux, setNiveaux] = useState([]);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        listerNiveaux();
    }, []);

    const listerNiveaux = () => {
        setChargement(true);
        api.get('/niveaux')
            .then((res) => { setNiveaux(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les niveaux.'); setChargement(false); });
    };

    const supprimerNiveau = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/niveaux/${id}`)
            .then(() => listerNiveaux())
            .catch(() => toast.error('Impossible de supprimer ce niveau.'));
    };

    const niveauxFiltres = niveaux.filter(n =>
        n.nom_niveau.toLowerCase().includes(recherche.toLowerCase()) ||
        n.abbr_niveau.toLowerCase().includes(recherche.toLowerCase())
    );

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-layer-group me-2 text-primary" />
                        Niveaux
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{niveaux.length}</span>
                    </h4>
                    <NavLink to="/NouveauNiveau" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouveau niveau
                    </NavLink>
                </div>

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
                                <th>#</th>
                                <th>Nom</th>
                                <th>Abréviation</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {niveauxFiltres.length === 0 && (
                                <tr><td colSpan={4} className="text-center text-muted py-3">Aucun niveau trouvé.</td></tr>
                            )}
                            {niveauxFiltres.map((niveau, i) => (
                                <tr key={niveau.id}>
                                    <td>{i + 1}</td>
                                    <td>{niveau.nom_niveau}</td>
                                    <td><span className="badge bg-light text-dark border">{niveau.abbr_niveau}</span></td>
                                    <td>
                                        <NavLink to={`/DetailsNiveau/${niveau.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerNiveau(niveau.id)}>Supprimer</button>
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
