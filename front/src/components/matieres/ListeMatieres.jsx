import React, { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import api from "../../api/axios";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeMatieres = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [matieres, setMatieres] = useState([]);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        listerMatieres();
    }, []);

    const listerMatieres = () => {
        setChargement(true);
        api.get('/matieres')
            .then((res) => { setMatieres(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les matières.'); setChargement(false); });
    };

    const supprimerMatiere = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/matieres/${id}`)
            .then(() => listerMatieres())
            .catch(() => toast.error('Impossible de supprimer cette matière.'));
    };

    const matieresFiltrees = matieres.filter(m =>
        m.libelle_matiere.toLowerCase().includes(recherche.toLowerCase()) ||
        m.abbr_matiere.toLowerCase().includes(recherche.toLowerCase()) ||
        (m.description_matiere || '').toLowerCase().includes(recherche.toLowerCase())
    );

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-book me-2 text-primary" />
                        Matières
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{matieres.length}</span>
                    </h4>
                    <NavLink to="/NouvelleMatiere" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle matière
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par libellé, abréviation ou description…"
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
                                <th>Abréviation</th>
                                <th>Libellé</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matieresFiltrees.length === 0 && (
                                <tr><td colSpan={5} className="text-center text-muted py-3">Aucune matière trouvée.</td></tr>
                            )}
                            {matieresFiltrees.map((matiere, i) => (
                                <tr key={matiere.id}>
                                    <td>{i + 1}</td>
                                    <td><span className="badge bg-light text-dark border">{matiere.abbr_matiere}</span></td>
                                    <td>{matiere.libelle_matiere}</td>
                                    <td className="text-muted">{matiere.description_matiere}</td>
                                    <td>
                                        <NavLink to={`/DetailsMatiere/${matiere.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerMatiere(matiere.id)}>Supprimer</button>
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

export default ListeMatieres;
