import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import api from "../../api/axios";
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeClasses = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [classes, setClasses]     = useState([]);
    const [niveaux, setNiveaux]     = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage]   = useState(1);
    const [total, setTotal]         = useState(0);
    const [filtreNiveau, setFiltreNiveau] = useState('');
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        setRecherche('');
        setFiltreNiveau('');
        api.get('/niveaux').then(res => setNiveaux(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        charger(1, '', '');
    }, [location.key]);

    const charger = (page, search, niveau) => {
        setChargement(true);
        const params = new URLSearchParams({ page });
        if (search)  params.append('search', search);
        if (niveau)  params.append('niveau_id', niveau);
        api.get(`/classes?${params}`)
            .then(res => {
                setClasses(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setTotal(res.data.total);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les classes.'); setChargement(false); });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        setFiltreNiveau('');
        charger(1, val, '');
    };

    const handleNiveau = (e) => {
        const val = e.target.value;
        setFiltreNiveau(val);
        setRecherche('');
        charger(1, '', val);
    };

    const handlePagination = (page) => {
        charger(page, recherche, filtreNiveau);
    };

    const supprimerClasse = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/classes/${id}`)
            .then(() => charger(currentPage, recherche, filtreNiveau))
            .catch(() => toast.error('Impossible de supprimer cette classe.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-school me-2 text-primary" />
                        Classes
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{total}</span>
                    </h4>
                    <NavLink to="/NouvelleClasse" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle classe
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom ou abréviation…"
                            value={recherche}
                            onChange={handleRecherche}
                        />
                    </div>
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreNiveau} onChange={handleNiveau}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map(n => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement…</span>
                        </div>
                    </div>
                ) : (
                    <>
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Nom</th>
                                <th>Abréviation</th>
                                <th>Niveau</th>
                                <th>Série</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.length === 0 && (
                                <tr><td colSpan={6} className="text-center text-muted py-3">Aucune classe trouvée.</td></tr>
                            )}
                            {classes.map((classe, i) => (
                                <tr key={classe.id}>
                                    <td>{(currentPage - 1) * 10 + i + 1}</td>
                                    <td>{classe.nom_classe}</td>
                                    <td><span className="badge bg-light text-dark border">{classe.abbr_classe}</span></td>
                                    <td>{classe.niveau?.nom_niveau}</td>
                                    <td>{classe.serie ? <span className="badge bg-secondary">{classe.serie.nom}</span> : <span className="text-muted">—</span>}</td>
                                    <td>
                                        <NavLink to={`/DetailsClasse/${classe.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerClasse(classe.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePagination} />
                    </>
                )}
            </div>
        </section>
    );
};

export default ListeClasses;
