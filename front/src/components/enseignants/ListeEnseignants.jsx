import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from "../../api/axios";
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeEnseignants = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [enseignants, setEnseignants] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        charger(1, '');
    }, []);

    const charger = (page, search) => {
        setChargement(true);
        const params = `page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        api.get(`/enseignants?${params}`)
            .then((res) => {
                setEnseignants(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les enseignants.');
                setChargement(false);
            });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        charger(1, val);
    };

    const supprimerEnseignant = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/enseignants/${id}`)
            .then(() => charger(currentPage, recherche))
            .catch(() => toast.error('Impossible de supprimer cet enseignant.'));
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                        Enseignants
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{enseignants.length > 0 ? (currentPage - 1) * 10 + enseignants.length : 0}</span>
                    </h4>
                    <NavLink to='/NouvelEnseignant' className='btn btn-primary btn-sm'>
                        <i className="fas fa-plus me-1" />Ajouter un enseignant
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom, prénoms ou matricule…"
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
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénoms</th>
                                <th>Matières</th>
                                <th>Classes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enseignants.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted py-3">Aucun enseignant trouvé.</td></tr>
                            )}
                            {enseignants.map((enseignant, i) => (
                                <tr key={enseignant.id}>
                                    <td>{(currentPage - 1) * 10 + i + 1}</td>
                                    <td>{enseignant.matricule_enseignant}</td>
                                    <td>{enseignant.nom_enseignant}</td>
                                    <td>{enseignant.prenoms_enseignant}</td>
                                    <td>
                                        {enseignant.matieres?.map((m) => (
                                            <span key={m.id} className="badge bg-secondary me-1">{m.libelle_matiere}</span>
                                        ))}
                                    </td>
                                    <td>
                                        {enseignant.classes?.map((c) => (
                                            <span key={c.id} className="badge bg-info text-dark me-1">{c.abbr_classe}</span>
                                        ))}
                                    </td>
                                    <td>
                                        <NavLink to={`/DetailsEnseignant/${enseignant.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerEnseignant(enseignant.id)}>Supprimer</button>
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

export default ListeEnseignants;
