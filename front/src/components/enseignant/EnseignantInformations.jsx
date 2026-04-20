import { useEffect, useState } from 'react';
import api from '../../api/axios';

const TYPES = {
    information:  { icon: 'fa-info-circle',    color: '#1a56a0' },
    evenement:    { icon: 'fa-calendar-star',  color: '#2e7d32' },
    urgence:      { icon: 'fa-exclamation-triangle', color: '#c62828' },
    reunion:      { icon: 'fa-users',          color: '#f57f17' },
    autre:        { icon: 'fa-bell',           color: '#6a1b9a' },
};

const EnseignantInformations = () => {
    const [informations, setInformations] = useState([]);
    const [chargement, setChargement]     = useState(true);

    useEffect(() => {
        api.get('/enseignant/informations')
            .then(({ data }) => setInformations(data))
            .finally(() => setChargement(false));
    }, []);

    const fmt = (str) => str ? new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-bell me-2 text-primary" />Informations de l'établissement</h4>

            {informations.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-bell-slash fa-3x mb-3 opacity-25 d-block" />
                    Aucune information
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {informations.map(info => {
                        const t = TYPES[info.type_info] ?? TYPES.autre;
                        return (
                            <div key={info.id} className="card border-0 shadow-sm">
                                <div className="card-body d-flex gap-3">
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                        background: t.color + '18',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <i className={`fas ${t.icon}`} style={{ color: t.color, fontSize: 18 }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="fw-bold">{info.titre}</div>
                                            <span className="text-muted small ms-3 flex-shrink-0">{fmt(info.date_info)}</span>
                                        </div>
                                        {info.contenu && (
                                            <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                                {info.contenu}
                                            </div>
                                        )}
                                        <span className="badge mt-2" style={{
                                            background: t.color + '18', color: t.color, fontSize: 10, border: `1px solid ${t.color}44`,
                                        }}>
                                            {info.type_info ?? 'information'}
                                        </span>
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

export default EnseignantInformations;
