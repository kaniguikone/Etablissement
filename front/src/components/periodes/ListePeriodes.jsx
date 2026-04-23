import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListePeriodes = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [periodes, setPeriodes]     = useState([]);
    const [recherche, setRecherche]   = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => { listerPeriodes(); }, [location.key]);

    const listerPeriodes = () => {
        setChargement(true);
        api.get('/periodes')
            .then(res => { setPeriodes(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les périodes.'); setChargement(false); });
    };

    const supprimerPeriode = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/periodes/${id}`)
            .then(() => listerPeriodes())
            .catch(() => toast.error('Impossible de supprimer cette période.'));
    };

    const filtres = periodes.filter(p =>
        (p.libelle_periode || '').toLowerCase().includes(recherche.toLowerCase()) ||
        (p.annee || '').toString().includes(recherche)
    );

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-calendar-alt me-2 text-primary" />
                        Périodes
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{periodes.length}</span>
                    </h4>
                    <NavLink to="/NouvellePeriode" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle période
                    </NavLink>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par libellé ou année…"
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
                                <th>Libellé</th>
                                <th>Abréviation</th>
                                <th>Année</th>
                                <th>Date début</th>
                                <th>Date fin</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtres.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted py-3">Aucune période trouvée.</td></tr>
                            )}
                            {filtres.map((p, i) => (
                                <tr key={p.id}>
                                    <td>{i + 1}</td>
                                    <td>{p.libelle_periode}</td>
                                    <td><span className="badge bg-light text-dark border">{p.abbr_libelle_periode}</span></td>
                                    <td>{p.annee}</td>
                                    <td>{p.date_debut ? new Date(p.date_debut).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td>{p.date_fin   ? new Date(p.date_fin).toLocaleDateString('fr-FR')   : '—'}</td>
                                    <td>
                                        <NavLink to={`/DetailsPeriode/${p.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerPeriode(p.id)}>Supprimer</button>
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

export default ListePeriodes;
