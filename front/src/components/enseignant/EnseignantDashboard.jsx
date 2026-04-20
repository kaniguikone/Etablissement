import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const EnseignantDashboard = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [devoirs, setDevoirs] = useState([]);
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/enseignant/classes'),
            api.get('/enseignant/devoirs'),
        ]).then(([{ data: c }, { data: d }]) => {
            setClasses(c);
            setDevoirs(d);
        }).finally(() => setChargement(false));
    }, []);

    // Classes uniques
    const classesUniques = [...new Map(classes.map(c => [c.classe_id, c])).values()];
    // Matières uniques
    const matieresUniques = [...new Set(classes.map(c => c.matiere_id))];

    const devoirsRecents = devoirs.slice(0, 5);

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-1 fw-bold">Bonjour Professeur {user?.name ?? ''} 👋</h4>
            <p className="text-muted mb-4">Voici un résumé de votre activité</p>

            {/* KPIs */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Classes', value: classesUniques.length, icon: 'fa-door-open', color: '#1a56a0' },
                    { label: 'Matières', value: matieresUniques.length, icon: 'fa-book', color: '#2e7d32' },
                    { label: 'Devoirs', value: devoirs.length, icon: 'fa-tasks', color: '#f57f17' },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="col-md-4">
                        <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `4px solid ${color} !important` }}>
                            <div className="card-body d-flex align-items-center gap-3" style={{ borderLeft: `4px solid ${color}`, borderRadius: 8 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: color + '18',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className={`fas ${icon}`} style={{ color, fontSize: 20 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                                    <div className="text-muted small">{label}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-3">
                {/* Mes classes & matières */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white fw-semibold border-bottom">
                            <i className="fas fa-door-open me-2 text-primary" />Mes classes
                        </div>
                        <div className="card-body p-0">
                            {classesUniques.length === 0 ? (
                                <p className="text-muted text-center py-4">Aucune classe assignée</p>
                            ) : classesUniques.map(cl => {
                                const matieres = classes
                                    .filter(c => c.classe_id === cl.classe_id)
                                    .map(c => c.libelle_matiere);
                                return (
                                    <div key={cl.classe_id} className="d-flex align-items-start gap-3 p-3 border-bottom">
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                                            background: '#1a56a018',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <span style={{ fontWeight: 700, color: '#1a56a0', fontSize: 11 }}>
                                                {cl.abbr_classe}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="fw-semibold small">{cl.nom_classe}</div>
                                            <div className="text-muted" style={{ fontSize: 12 }}>
                                                {matieres.join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Devoirs récents */}
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white fw-semibold border-bottom">
                            <i className="fas fa-tasks me-2 text-primary" />Devoirs récents
                        </div>
                        <div className="card-body p-0">
                            {devoirsRecents.length === 0 ? (
                                <p className="text-muted text-center py-4">Aucun devoir</p>
                            ) : devoirsRecents.map(d => (
                                <div key={d.id} className="d-flex align-items-center gap-3 p-3 border-bottom">
                                    <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                                        {d.type_devoir?.code_type ?? '?'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="fw-semibold small text-truncate">{d.code_devoir}</div>
                                        <div className="text-muted" style={{ fontSize: 12 }}>
                                            {d.matiere?.libelle_matiere} · {d.classe?.nom_classe ?? d.niveau?.nom_niveau}
                                        </div>
                                    </div>
                                    <span className="text-muted small">{d.date_devoir}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnseignantDashboard;
