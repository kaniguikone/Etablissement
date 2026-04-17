import { useEffect, useState } from 'react';
import api from '../../api/axios';

const STATUTS = {
    a_assurer:    { label: 'À assurer',   cls: 'bg-warning text-dark' },
    couvert:      { label: 'Couvert',     cls: 'bg-success' },
    non_couvert:  { label: 'Non couvert', cls: 'bg-danger' },
};

const EnseignantRemplacements = () => {
    const [remplacements, setRemplacements] = useState([]);
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        api.get('/enseignant/remplacements')
            .then(({ data }) => setRemplacements(data))
            .finally(() => setChargement(false));
    }, []);

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-exchange-alt me-2 text-primary" />Mes remplacements</h4>

            {remplacements.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-exchange-alt fa-3x mb-3 opacity-25 d-block" />
                    Aucun remplacement à venir
                </div>
            ) : (
                <div className="row g-3">
                    {remplacements.map(r => {
                        const st = STATUTS[r.statut] ?? STATUTS.a_assurer;
                        return (
                            <div key={r.id} className="col-md-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <div className="fw-bold">{r.date_remplacement}</div>
                                                <div className="text-muted small">
                                                    {r.heure_debut?.slice(0,5)} – {r.heure_fin?.slice(0,5)}
                                                </div>
                                            </div>
                                            <span className={`badge ${st.cls}`}>{st.label}</span>
                                        </div>
                                        <div className="small">
                                            <div><i className="fas fa-chalkboard me-2 text-muted" />{r.classe?.nom_classe ?? '—'}</div>
                                            <div><i className="fas fa-book me-2 text-muted" />{r.matiere?.libelle_matiere ?? '—'}</div>
                                            {r.enseignant_absent && (
                                                <div><i className="fas fa-user-times me-2 text-muted" />
                                                    {r.enseignant_absent.nom_enseignant} {r.enseignant_absent.prenoms_enseignant}
                                                </div>
                                            )}
                                            {r.motif && (
                                                <div className="text-muted mt-1 fst-italic">{r.motif}</div>
                                            )}
                                        </div>
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

export default EnseignantRemplacements;
