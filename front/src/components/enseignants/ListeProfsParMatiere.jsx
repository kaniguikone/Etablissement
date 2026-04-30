import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ListeProfsParMatiere = () => {
    const { toast } = useToast();
    const location = useLocation();
    const [donnees, setDonnees] = useState([]);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        setChargement(true);
        api.get('/profsParMatieres')
            .then(res => { setDonnees(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les données.'); setChargement(false); });
    }, [location.key]);

    const terme = recherche.toLowerCase();
    const donneesFiltrees = donnees.filter(m =>
        !terme ||
        m.libelle_matiere.toLowerCase().includes(terme) ||
        m.abbr_matiere.toLowerCase().includes(terme) ||
        m.enseignants.some(e =>
            e.nom_enseignant.toLowerCase().includes(terme) ||
            e.prenoms_enseignant.toLowerCase().includes(terme)
        )
    );

    const totalProfs = new Set(
        donnees.flatMap(m => m.enseignants.map(e => e.id))
    ).size;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                        Enseignants par matière
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>
                            {donnees.length} matières
                        </span>
                        <span className="badge bg-primary ms-1" style={{ fontSize: 13 }}>
                            {totalProfs} enseignants
                        </span>
                    </h4>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par matière ou nom d'enseignant…"
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
                    <table className="table table-striped table-sm align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th style={{ width: 100 }}>Abrév.</th>
                                <th style={{ width: 220 }}>Matière</th>
                                <th>Enseignants affectés</th>
                            </tr>
                        </thead>
                        <tbody>
                            {donneesFiltrees.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted py-3">
                                        Aucune matière trouvée.
                                    </td>
                                </tr>
                            )}
                            {donneesFiltrees.map((matiere, i) => (
                                <tr key={matiere.id}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <span className="badge bg-light text-dark border">
                                            {matiere.abbr_matiere}
                                        </span>
                                    </td>
                                    <td>{matiere.libelle_matiere}</td>
                                    <td>
                                        {matiere.enseignants.length === 0 ? (
                                            <span className="text-muted fst-italic">Non affecté</span>
                                        ) : (
                                            <div className="d-flex flex-column">
                                                {matiere.enseignants.map((ens, idx) => (
                                                    <div
                                                        key={ens.id}
                                                        className="d-flex align-items-center gap-2 flex-wrap py-1"
                                                        style={idx < matiere.enseignants.length - 1 ? { borderBottom: '1px solid #dee2e6' } : {}}
                                                    >
                                                        <span>
                                                            <i className="fas fa-user-tie me-1 text-muted" style={{ fontSize: 11 }} />
                                                            {ens.prenoms_enseignant} {ens.nom_enseignant}
                                                        </span>
                                                        <span className="d-flex gap-1 flex-wrap">
                                                            {ens.classes.map(cls => (
                                                                <span key={cls} className="badge bg-info text-dark" style={{ fontSize: 11 }}>
                                                                    {cls}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

export default ListeProfsParMatiere;
