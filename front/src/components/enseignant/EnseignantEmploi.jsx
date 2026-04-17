import { useEffect, useState } from 'react';
import api from '../../api/axios';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const COULEURS = ['#1565C0', '#2E7D32', '#C62828', '#F57F17', '#00838F', '#6A1B9A'];

const EnseignantEmploi = () => {
    const [emploi, setEmploi] = useState({});
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        api.get('/enseignant/emploi')
            .then(({ data }) => setEmploi(data))
            .finally(() => setChargement(false));
    }, []);

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    const joursAvecCours = JOURS.filter(j => emploi[j]?.length > 0);
    if (joursAvecCours.length === 0) return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-calendar-alt me-2 text-primary" />Emploi du temps</h4>
            <div className="text-center text-muted py-5">
                <i className="fas fa-calendar-alt fa-3x mb-3 opacity-25 d-block" />
                Aucun cours assigné
            </div>
        </div>
    );

    // Palette couleur par matière
    const matiereColors = {};
    let colorIdx = 0;
    Object.values(emploi).flat().forEach(c => {
        if (!matiereColors[c.matiere_id]) {
            matiereColors[c.matiere_id] = COULEURS[colorIdx++ % COULEURS.length];
        }
    });

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-calendar-alt me-2 text-primary" />Emploi du temps</h4>

            <div className="row g-3">
                {JOURS.filter(j => emploi[j]?.length > 0).map(jour => (
                    <div key={jour} className="col-md-6 col-xl-4">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-header bg-white fw-semibold text-capitalize border-bottom">
                                <i className="fas fa-calendar-day me-2 text-primary" />
                                {jour.charAt(0).toUpperCase() + jour.slice(1)}
                            </div>
                            <div className="card-body p-0">
                                {[...emploi[jour]]
                                    .sort((a, b) => (a.heure_debut ?? '').localeCompare(b.heure_debut ?? ''))
                                    .map((c, i) => {
                                        const color = matiereColors[c.matiere_id] ?? '#1a56a0';
                                        return (
                                            <div key={c.id ?? i} className="d-flex align-items-start gap-3 p-3 border-bottom">
                                                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{c.heure_debut?.slice(0,5) ?? '—'}</div>
                                                    <div style={{ fontSize: 10, color: '#aaa' }}>↓</div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{c.heure_fin?.slice(0,5) ?? '—'}</div>
                                                </div>
                                                <div style={{
                                                    width: 4, borderRadius: 4, alignSelf: 'stretch',
                                                    background: color, flexShrink: 0,
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className="fw-semibold small">{c.matiere?.libelle_matiere ?? '—'}</div>
                                                    <div className="text-muted" style={{ fontSize: 12 }}>{c.classe?.nom_classe ?? '—'}</div>
                                                    {c.salle && (
                                                        <div style={{ fontSize: 11, color: '#999' }}>
                                                            <i className="fas fa-map-marker-alt me-1" />{c.salle}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EnseignantEmploi;
