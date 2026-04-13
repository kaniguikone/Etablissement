import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeInformations = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [informations, setInformations] = useState([]);
    const [currentPage, setCurrentPage]   = useState(1);
    const [lastPage, setLastPage]         = useState(1);
    const [total, setTotal]               = useState(0);
    const [recherche, setRecherche]       = useState('');
    const [chargement, setChargement]     = useState(true);

    useEffect(() => { charger(1, ''); }, []);

    const charger = (page, search) => {
        setChargement(true);
        const params = new URLSearchParams({ page });
        if (search) params.append('search', search);
        api.get(`/informations?${params}`)
            .then(res => {
                setInformations(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setTotal(res.data.total);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les informations.'); setChargement(false); });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        charger(1, val);
    };

    const supprimerInformation = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/informations/${id}`)
            .then(() => charger(currentPage, recherche))
            .catch(() => toast.error('Impossible de supprimer cette information.'));
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-bullhorn me-2 text-primary" />
                        Informations
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{total}</span>
                    </h4>
                    <NavLink to="/NouvelleInformation" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle information
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par titre ou contenu…"
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
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Titre</th>
                                <th>Contenu</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {informations.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted py-3">Aucune information trouvée.</td></tr>
                            )}
                            {informations.map((info, i) => (
                                <tr key={info.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>{info.date_info}</td>
                                    <td className="fw-semibold">{info.titre}</td>
                                    <td className="text-muted text-truncate" style={{ maxWidth: 300 }}>{info.contenu}</td>
                                    <td>
                                        <NavLink to={`/DetailsInformation/${info.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerInformation(info.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={page => charger(page, recherche)} />
            </div>
        </section>
    );
};

export default ListeInformations;
