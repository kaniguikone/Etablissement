import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeScolarites = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [scolarites, setScolarites] = useState([]);
    const [niveaux, setNiveaux] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [filtreNiveau, setFiltreNiveau] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        listerScolarites(1);
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const listerScolarites = (page = 1) => {
        setChargement(true);
        api.get(`/scolarites?page=${page}`)
            .then((res) => {
                setScolarites(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les scolarités.');
                setChargement(false);
            });
    };

    const handleNiveauChange = (e) => {
        const val = e.target.value;
        setFiltreNiveau(val);
        if (val === '') {
            listerScolarites(1);
        } else {
            setChargement(true);
            api.get(`/scolaritesNiveau/${val}`)
                .then((res) => {
                    setScolarites(res.data);
                    setLastPage(1);
                    setCurrentPage(1);
                    setChargement(false);
                })
                .catch(() => {
                    toast.error('Impossible de filtrer les scolarités.');
                    setChargement(false);
                });
        }
    };

    const supprimerScolarite = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/scolarites/${id}`)
            .then(() => listerScolarites(currentPage))
            .catch(() => toast.error('Impossible de supprimer cette scolarité.'));
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-money-bill-wave me-2 text-primary" />
                        Scolarités
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{scolarites.length > 0 ? (currentPage - 1) * 15 + scolarites.length : 0}</span>
                    </h4>
                    <NavLink to="/NouvelleScolarite" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle scolarité
                    </NavLink>
                </div>
                <div className="row mb-2">
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreNiveau} onChange={handleNiveauChange}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
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
                                <th>Libellé échéance</th>
                                <th>Date échéance</th>
                                <th>Montant</th>
                                <th>Niveau</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scolarites.map((scolarite, i) => (
                                <tr key={scolarite.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>{scolarite.libelle_echeance}</td>
                                    <td>{scolarite.date_echeance}</td>
                                    <td>{scolarite.montant_echeance}</td>
                                    <td>{scolarite.niveau?.nom_niveau}</td>
                                    <td>
                                        <NavLink to={`/DetailsScolarite/${scolarite.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerScolarite(scolarite.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {lastPage > 1 && (
                    <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={listerScolarites} />
                )}
            </div>
        </section>
    );
};

export default ListeScolarites;
