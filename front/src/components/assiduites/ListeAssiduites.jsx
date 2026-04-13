import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const BADGE = { present: 'bg-success', absent: 'bg-danger', retard: 'bg-warning text-dark' };

const ListeAssiduites = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [assiduites, setAssiduites] = useState([]);
    const [currentPage, setCurrentPage]  = useState(1);
    const [lastPage, setLastPage]        = useState(1);
    const [chargement, setChargement]    = useState(true);

    useEffect(() => {
        listerAssiduites(1);
    }, []);

    const listerAssiduites = (page = 1) => {
        setChargement(true);
        api.get(`/assiduites?page=${page}`)
            .then((res) => {
                setAssiduites(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les assiduités.');
                setChargement(false);
            });
    };

    const supprimerAssiduite = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/assiduites/${id}`)
            .then(() => listerAssiduites(currentPage))
            .catch(() => toast.error('Impossible de supprimer.'));
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-clipboard-check me-2 text-primary" />
                        Assiduités
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{assiduites.length > 0 ? (currentPage - 1) * 20 + assiduites.length : 0}</span>
                    </h4>
                    <NavLink to="/FeuillePresence" className="btn btn-primary btn-sm">
                        <i className="fas fa-pen me-1" />Saisir une feuille
                    </NavLink>
                </div>
                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement...</span>
                        </div>
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Élève</th>
                                <th>Matière</th>
                                <th>Période</th>
                                <th>Statut</th>
                                <th>Remarque</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assiduites.map((a, i) => (
                                <tr key={a.id}>
                                    <td>{(currentPage - 1) * 20 + i + 1}</td>
                                    <td>{a.date_assiduite}</td>
                                    <td>{a.eleve?.nom_eleve} {a.eleve?.prenoms_eleve}</td>
                                    <td>{a.matiere?.abbr_matiere}</td>
                                    <td>{a.periode?.abbr_libelle_periode}</td>
                                    <td>
                                        <span className={`badge ${BADGE[a.statut]}`}>
                                            {a.statut}
                                        </span>
                                    </td>
                                    <td>{a.remarque}</td>
                                    <td>
                                        <NavLink to={`/DetailsAssiduite/${a.id}`} className="btn btn-primary btn-sm me-1">Modifier</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerAssiduite(a.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!chargement && lastPage > 1 && (
                    <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={listerAssiduites} />
                )}
            </div>
        </section>
    );
};

export default ListeAssiduites;
