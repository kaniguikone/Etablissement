import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeTypeDevoirs = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [typeDevoirs, setTypeDevoirs] = useState([]);
    const [recherche, setRecherche]     = useState('');
    const [chargement, setChargement]   = useState(true);

    useEffect(() => { listerTypeDevoirs(); }, [location.key]);

    const listerTypeDevoirs = () => {
        setChargement(true);
        api.get('/typeDevoirs')
            .then(res => { setTypeDevoirs(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les types de devoirs.'); setChargement(false); });
    };

    const supprimerTypeDevoir = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/typeDevoirs/${id}`)
            .then(() => listerTypeDevoirs())
            .catch(() => toast.error('Impossible de supprimer ce type de devoir.'));
    };

    const filtres = typeDevoirs.filter(t =>
        t.code_type_devoir.toLowerCase().includes(recherche.toLowerCase()) ||
        t.description_type_devoir.toLowerCase().includes(recherche.toLowerCase())
    );

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-tags me-2 text-primary" />
                        Types de devoirs
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{typeDevoirs.length}</span>
                    </h4>
                    <NavLink to="/NouveauTypeDevoir" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouveau type
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par code ou description…"
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
                                <th>Code</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtres.length === 0 && (
                                <tr><td colSpan={4} className="text-center text-muted py-3">Aucun type de devoir trouvé.</td></tr>
                            )}
                            {filtres.map((type, i) => (
                                <tr key={type.id}>
                                    <td>{i + 1}</td>
                                    <td><span className="badge bg-light text-dark border">{type.code_type_devoir}</span></td>
                                    <td>{type.description_type_devoir}</td>
                                    <td>
                                        <NavLink to={`/DetailsTypeDevoir/${type.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerTypeDevoir(type.id)}>Supprimer</button>
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

export default ListeTypeDevoirs;
