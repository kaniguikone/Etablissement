import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeParents = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [parents, setParents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        charger(1, '');
    }, [location.key]);

    const charger = (page, search) => {
        setChargement(true);
        const params = `page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        api.get(`/parents?${params}`)
            .then((res) => {
                setParents(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les parents.');
                setChargement(false);
            });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        charger(1, val);
    };

    const supprimerParent = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/parents/${id}`)
            .then(() => charger(currentPage, recherche))
            .catch(() => toast.error('Impossible de supprimer ce parent.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-user-friends me-2 text-primary" />
                        Parents
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{parents.length > 0 ? (currentPage - 1) * 15 + parents.length : 0}</span>
                    </h4>
                    <NavLink to="/NouveauParent" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Ajouter un parent
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom, prénom ou numéro…"
                            value={recherche}
                            onChange={handleRecherche}
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
                    <table className="table table-striped table-sm text-left">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Nom</th>
                                <th>Prénom</th>
                                <th>Numéro</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parents.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted py-3">Aucun parent trouvé.</td></tr>
                            )}
                            {parents.map((parent, i) => (
                                <tr key={parent.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>{parent.nom_parent}</td>
                                    <td>{parent.prenom_parent}</td>
                                    <td>{parent.numero_parent}</td>
                                    <td>
                                        <NavLink to={`/DetailsParent/${parent.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerParent(parent.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(page) => charger(page, recherche)} />
            </div>
        </section>
    );
};

export default ListeParents;
