import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ChargeEnseignants = () => {
    const { toast } = useToast();

    const [niveaux,  setNiveaux]  = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [donnees,  setDonnees]  = useState([]);
    const [chargement, setChargement] = useState(false);
    const [detailId,   setDetailId]   = useState(null);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
        charger('');
    }, []);

    const charger = (nid) => {
        setChargement(true);
        const params = nid ? `?niveau_id=${nid}` : '';
        api.get(`/volumesHoraires/chargeEnseignants${params}`)
            .then((r) => { setDonnees(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger.'); setChargement(false); });
    };

    const handleNiveau = (e) => {
        setNiveauId(e.target.value);
        charger(e.target.value);
    };

    const couleurAlerte = (alerte) => {
        if (alerte === 'surcharge')   return 'danger';
        if (alerte === 'sous_charge') return 'warning';
        return 'success';
    };

    const iconAlerte = (alerte) => {
        if (alerte === 'surcharge')   return '🔴';
        if (alerte === 'sous_charge') return '🟡';
        return '🟢';
    };

    const totalHeures = donnees.reduce((s, d) => s + d.heures_semaine, 0);
    const nbSurcharge  = donnees.filter((d) => d.alerte === 'surcharge').length;
    const nbSousCharge = donnees.filter((d) => d.alerte === 'sous_charge').length;

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Charge horaire des enseignants</h4>
                </div>

                {/* Filtre */}
                <div className="d-flex gap-3 mb-3 align-items-end flex-wrap">
                    <div>
                        <label className="form-label mb-1">Filtrer par niveau</label>
                        <select className="form-select form-select-sm" style={{ width: 220 }}
                            value={niveauId} onChange={handleNiveau}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                </div>

                {chargement && <div className="text-center py-3"><div className="spinner-border text-primary" /></div>}

                {!chargement && donnees.length > 0 && (
                    <>
                        {/* Résumé */}
                        <div className="d-flex gap-3 mb-3 flex-wrap">
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 110 }}>
                                <div className="fs-5 fw-bold">{donnees.length}</div>
                                <div className="small text-muted">Enseignants</div>
                            </div>
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 110 }}>
                                <div className="fs-5 fw-bold text-primary">{totalHeures.toFixed(1)}h</div>
                                <div className="small text-muted">Total h/semaine</div>
                            </div>
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 110 }}>
                                <div className="fs-5 fw-bold text-danger">{nbSurcharge}</div>
                                <div className="small text-muted">En surcharge (&gt;22h)</div>
                            </div>
                            <div className="border rounded px-3 py-2 text-center" style={{ minWidth: 110 }}>
                                <div className="fs-5 fw-bold text-warning">{nbSousCharge}</div>
                                <div className="small text-muted">Sous-charge (&lt;8h)</div>
                            </div>
                        </div>

                        {/* Tableau */}
                        <div className="table-responsive">
                            <table className="table table-sm table-bordered" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-dark">
                                    <tr>
                                        <th>Enseignant</th>
                                        <th className="text-center">H/semaine</th>
                                        <th className="text-center">Classes</th>
                                        <th>Classes concernées</th>
                                        <th className="text-center">Alerte</th>
                                        <th style={{ width: 80 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donnees.map((d) => (
                                        <>
                                            <tr key={d.enseignant_id}>
                                                <td className="fw-bold">{d.nom}</td>
                                                <td className="text-center">
                                                    <span className={`badge bg-${couleurAlerte(d.alerte)}`}>
                                                        {d.heures_semaine}h
                                                    </span>
                                                </td>
                                                <td className="text-center">{d.nb_classes}</td>
                                                <td className="text-muted small">{d.classes.join(', ')}</td>
                                                <td className="text-center">
                                                    {d.alerte
                                                        ? <span className={`badge bg-${couleurAlerte(d.alerte)}`}>
                                                            {d.alerte === 'surcharge' ? 'Surcharge' : 'Sous-charge'}
                                                          </span>
                                                        : <span className="text-success">✅ Normal</span>
                                                    }
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm py-0"
                                                        onClick={() => setDetailId(detailId === d.enseignant_id ? null : d.enseignant_id)}
                                                    >
                                                        {detailId === d.enseignant_id ? 'Fermer' : 'Détail'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {detailId === d.enseignant_id && (
                                                <tr key={`det-${d.enseignant_id}`}>
                                                    <td colSpan={6} className="p-0">
                                                        <div className="p-3 bg-light">
                                                            <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.83rem' }}>
                                                                <thead className="table-secondary">
                                                                    <tr>
                                                                        <th>Matière</th>
                                                                        <th className="text-center">H/semaine</th>
                                                                        <th className="text-center">Créneaux</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {d.par_matiere.map((m, i) => (
                                                                        <tr key={i}>
                                                                            <td>{m.matiere} <span className="text-muted small">({m.abbr})</span></td>
                                                                            <td className="text-center fw-bold">{m.heures}h</td>
                                                                            <td className="text-center text-muted">{m.nb_creneaux}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!chargement && donnees.length === 0 && (
                    <p className="text-muted">Aucun enseignant avec des créneaux dans l'emploi du temps.</p>
                )}
            </div>
        </section>
    );
};

export default ChargeEnseignants;
