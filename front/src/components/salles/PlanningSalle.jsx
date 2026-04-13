import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import api from '../../api/axios';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const PlanningSalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [salle, setSalle] = useState(null);
    const [planning, setPlanning] = useState({});
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get(`/salles/${id}`),
            api.get(`/salles/${id}/planning`),
        ]).then(([{ data: s }, { data: p }]) => {
            setSalle(s);
            setPlanning(p);
        }).catch(() => navigate('/Salles'))
          .finally(() => setChargement(false));
    }, [id]);

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

    const totalCreneaux = Object.values(planning).reduce((s, c) => s + c.length, 0);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center mb-4 gap-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/Salles')}>
                    <i className="fas fa-arrow-left" />
                </button>
                <div>
                    <h4 className="mb-0">
                        <i className="fas fa-calendar-week me-2 text-primary" />
                        Planning — {salle?.nom}
                    </h4>
                    <small className="text-muted">
                        {salle?.type} {salle?.batiment ? `· ${salle.batiment}` : ''}
                        {salle?.capacite ? ` · ${salle.capacite} places` : ''}
                        {' '}· <strong>{totalCreneaux}</strong> créneau{totalCreneaux !== 1 ? 'x' : ''} / semaine
                    </small>
                </div>
            </div>

            {totalCreneaux === 0 ? (
                <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2" />
                    Aucun créneau d'emploi du temps n'est assigné à cette salle.
                </div>
            ) : (
                <div className="row g-3">
                    {JOURS.map(jour => {
                        const creneaux = planning[jour] ?? [];
                        if (creneaux.length === 0) return null;
                        return (
                            <div key={jour} className="col-md-4">
                                <div className="card h-100">
                                    <div className="card-header py-2 bg-primary text-white">
                                        <strong className="text-capitalize">{jour}</strong>
                                        <span className="badge bg-white text-primary ms-2">{creneaux.length}</span>
                                    </div>
                                    <div className="card-body p-0">
                                        {creneaux.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)).map(c => (
                                            <NavLink
                                                key={c.id}
                                                to={`/DetailsEmploiDuTemps/${c.id}`}
                                                className="d-flex align-items-center p-3 border-bottom text-decoration-none text-dark"
                                                style={{ gap: 12 }}
                                            >
                                                <div className="text-center" style={{ minWidth: 50 }}>
                                                    <div className="fw-bold text-primary" style={{ fontSize: 13 }}>
                                                        {c.heure_debut?.substring(0, 5)}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: 11 }}>
                                                        {c.heure_fin?.substring(0, 5)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="fw-semibold" style={{ fontSize: 13 }}>
                                                        {c.matiere?.libelle_matiere ?? '—'}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: 11 }}>
                                                        {c.classe?.nom_classe ?? '—'}
                                                    </div>
                                                    {c.enseignant && (
                                                        <div className="text-muted" style={{ fontSize: 11 }}>
                                                            {c.enseignant.nom_enseignant} {c.enseignant.prenoms_enseignant}
                                                        </div>
                                                    )}
                                                </div>
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PlanningSalle;
