import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centralApi as axios } from '../../api/axios';

const GestionTemplatesSuperAdmin = () => {
    const navigate = useNavigate();

    const [templates,  setTemplates]  = useState([]);
    const [chargement, setChargement] = useState(true);
    const [erreur,     setErreur]     = useState('');

    useEffect(() => {
        axios.get('/superadmin/templates')
            .then(r => setTemplates(r.data))
            .catch(() => setErreur('Impossible de charger les modèles.'))
            .finally(() => setChargement(false));
    }, []);

    if (chargement) return (
        <section className="page-wrapper">
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        </section>
    );

    return (
        <section className="page-wrapper">
            <div className="container-fluid">
                <h4 className="mb-1"><i className="fas fa-layer-group me-2 text-primary" />Modèles de type d'établissement</h4>
                <p className="text-muted mb-4">
                    Configurez les niveaux, matières, séries et coefficients de chaque type d'établissement.
                </p>

                {erreur && <div className="alert alert-danger py-2 small mb-3"><i className="fas fa-exclamation-circle me-2" />{erreur}</div>}

                <div className="alert alert-info py-2 small mb-4">
                    <i className="fas fa-info-circle me-2" />
                    Pour appliquer un modèle à un établissement, rendez-vous dans <strong>Abonnements</strong> et utilisez le bouton <strong>Modèle</strong> sur la ligne de l'établissement concerné.
                </div>

                <div className="row g-3">
                    {templates.map(t => (
                        <div key={t.type} className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-body d-flex align-items-start gap-3">
                                    <div className="flex-grow-1">
                                        <div className="fw-bold mb-1">{t.nom}</div>
                                        <div className="text-muted small">{t.description}</div>
                                        {t.stats && (
                                            <div className="d-flex gap-2 mt-2 flex-wrap">
                                                {Object.entries(t.stats).map(([k, v]) => (
                                                    <span key={k} className="badge bg-light text-dark border">
                                                        {v} {k.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button className="btn btn-sm btn-outline-primary flex-shrink-0"
                                        onClick={() => navigate(`/superadmin/templates/${t.type}`)}>
                                        <i className="fas fa-edit me-1" />Modifier
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GestionTemplatesSuperAdmin;
