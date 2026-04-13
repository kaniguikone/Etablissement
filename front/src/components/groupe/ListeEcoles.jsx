import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centralApi } from '../../api/axios';

const ListeEcoles = () => {
    const navigate  = useNavigate();
    const [ecoles, setEcoles]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur]   = useState('');

    useEffect(() => {
        centralApi.get('/group/ecoles')
            .then(r => setEcoles(r.data))
            .catch(() => setErreur('Impossible de charger les établissements.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <span className="spinner-border text-primary" />
        </div>
    );

    if (erreur) return <div className="alert alert-danger m-4">{erreur}</div>;

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1000 }}>
            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-school me-2 text-primary" />
                    Mes établissements
                </h4>
                <p className="text-muted small mb-0">{ecoles.length} établissement(s) dans le groupe</p>
            </div>

            <div className="row g-3">
                {ecoles.map(ecole => {
                    const domaine = ecole.domains?.[0]?.domain ?? '—';
                    const expire  = ecole.date_expiration
                        ? new Date(ecole.date_expiration).toLocaleDateString('fr-FR')
                        : 'Illimitée';
                    const expired = ecole.date_expiration && new Date(ecole.date_expiration) < new Date();
                    const planCouleur = ecole.plan === 'pro' ? '#0d6efd' : ecole.plan === 'basic' ? '#198754' : '#6c757d';

                    return (
                        <div key={ecole.id} className="col-12 col-md-6 col-lg-4">
                            <div className="card shadow-sm h-100" style={{
                                borderRadius: 12,
                                borderTop: `4px solid ${planCouleur}`,
                            }}>
                                <div className="card-body d-flex flex-column gap-3">

                                    {/* En-tête */}
                                    <div className="d-flex align-items-start justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                                background: planCouleur + '15',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <i className="fas fa-school" style={{ color: planCouleur, fontSize: 18 }} />
                                            </div>
                                            <div>
                                                <div className="fw-bold" style={{ fontSize: 14 }}>{ecole.nom}</div>
                                                {ecole.ville && (
                                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                                        <i className="fas fa-map-marker-alt me-1" />{ecole.ville}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`badge rounded-pill bg-${ecole.actif ? 'success' : 'danger'}`} style={{ fontSize: 10 }}>
                                            {ecole.actif ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>

                                    {/* Infos */}
                                    <div className="d-flex flex-column gap-2" style={{ fontSize: 13 }}>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-muted"><i className="fas fa-globe me-2" />Domaine</span>
                                            <code style={{ fontSize: 11 }}>{domaine}</code>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-muted"><i className="fas fa-tag me-2" />Plan</span>
                                            <span className="badge" style={{ background: planCouleur }}>{ecole.plan}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="text-muted"><i className="fas fa-calendar-alt me-2" />Expiration</span>
                                            <span className={expired ? 'text-danger fw-semibold' : 'text-muted'} style={{ fontSize: 12 }}>
                                                {expired && <i className="fas fa-exclamation-triangle me-1" />}
                                                {expire}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bouton */}
                                    <div className="mt-auto">
                                        <button
                                            className="btn btn-sm w-100 fw-semibold"
                                            style={{ background: planCouleur + '15', color: planCouleur, border: 'none', borderRadius: 8 }}
                                            onClick={() => navigate(`/groupe/ecoles/${ecole.id}`)}
                                        >
                                            <i className="fas fa-chart-bar me-2" />Voir les statistiques
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ListeEcoles;
