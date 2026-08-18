import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const STATUTS = {
    a_couvrir:   { label: 'À couvrir',   cls: 'bg-warning text-dark' },
    couvert:     { label: 'Couvert',      cls: 'bg-success' },
    non_couvert: { label: 'Non couvert',  cls: 'bg-danger' },
};

const ListeRemplacements = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();

    const [remplacements, setRemplacements] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [filtre, setFiltre] = useState({ date: '', statut: '', niveau_id: '', matiere_id: '' });
    const [niveaux, setNiveaux]   = useState([]);
    const [matieres, setMatieres] = useState([]);

    useEffect(() => {
        api.get('/niveaux').then(r => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/matieres').then(r => setMatieres(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    const charger = async () => {
        setChargement(true);
        try {
            const params = {};
            if (filtre.date)       params.date       = filtre.date;
            if (filtre.statut)     params.statut     = filtre.statut;
            if (filtre.niveau_id)  params.niveau_id  = filtre.niveau_id;
            if (filtre.matiere_id) params.matiere_id = filtre.matiere_id;
            const [{ data: r }, { data: d }] = await Promise.all([
                api.get('/remplacements', { params }),
                api.get('/remplacements/dashboard'),
            ]);
            setRemplacements(r);
            setDashboard(d);
        } catch {
            toast('Erreur lors du chargement.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [filtre, location.key]);

    const supprimer = async (id) => {
        if (!await confirmer('Supprimer ce remplacement ?')) return;
        try {
            await api.delete(`/remplacements/${id}`);
            toast('Remplacement supprimé.', 'success');
            charger();
        } catch {
            toast('Erreur.', 'danger');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0"><i className="fas fa-exchange-alt me-2 text-primary" />Remplacements</h4>
                <NavLink to="/NouveauRemplacement" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />Nouveau remplacement
                </NavLink>
            </div>

            {/* KPIs semaine */}
            {dashboard && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'À couvrir',    val: dashboard.stats.a_couvrir,    cls: 'border-warning', icon: 'fas fa-exclamation-circle text-warning' },
                        { label: 'Couverts',      val: dashboard.stats.couverts,     cls: 'border-success', icon: 'fas fa-check-circle text-success' },
                        { label: 'Non couverts',  val: dashboard.stats.non_couverts, cls: 'border-danger',  icon: 'fas fa-times-circle text-danger' },
                    ].map(k => (
                        <div key={k.label} className="col-md-4">
                            <div className={`card border-start border-4 ${k.cls}`}>
                                <div className="card-body d-flex align-items-center gap-3">
                                    <i className={`${k.icon} fa-2x`} />
                                    <div>
                                        <div className="fs-4 fw-bold">{k.val}</div>
                                        <div className="text-muted small">{k.label} cette semaine</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filtres */}
            <div className="card mb-4">
                <div className="card-body py-2">
                    <div className="row g-2">
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Date</label>
                            <input type="date" className="form-control form-control-sm"
                                value={filtre.date} onChange={e => setFiltre(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Statut</label>
                            <select className="form-select form-select-sm"
                                value={filtre.statut} onChange={e => setFiltre(f => ({ ...f, statut: e.target.value }))}>
                                <option value="">Tous</option>
                                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Niveau</label>
                            <select className="form-select form-select-sm"
                                value={filtre.niveau_id} onChange={e => setFiltre(f => ({ ...f, niveau_id: e.target.value, matiere_id: '' }))}>
                                <option value="">Tous</option>
                                {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Matière</label>
                            <select className="form-select form-select-sm"
                                value={filtre.matiere_id} onChange={e => setFiltre(f => ({ ...f, matiere_id: e.target.value }))}>
                                <option value="">Toutes</option>
                                {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2 d-flex align-items-end">
                            <button className="btn btn-sm btn-outline-secondary w-100"
                                onClick={() => setFiltre({ date: '', statut: '', niveau_id: '', matiere_id: '' })}>
                                <i className="fas fa-times me-1" />Réinitialiser
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Créneau</th>
                                    <th>Absent</th>
                                    <th>Remplaçant</th>
                                    <th>Statut</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {remplacements.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-muted">Aucun remplacement</td></tr>
                                ) : remplacements.map(r => {
                                    const st = STATUTS[r.statut] || STATUTS.a_couvrir;
                                    return (
                                        <tr key={r.id}>
                                            <td className="fw-semibold">{new Date(r.date_remplacement).toLocaleDateString('fr-FR')}</td>
                                            <td>
                                                <div className="fw-semibold small">{r.creneau?.matiere?.libelle_matiere ?? '—'}</div>
                                                <div className="text-muted small">
                                                    {r.creneau?.classe?.nom_classe} · {r.creneau?.heure_debut?.substring(0,5)}–{r.creneau?.heure_fin?.substring(0,5)}
                                                </div>
                                            </td>
                                            <td>{r.enseignant_absent?.nom_enseignant} {r.enseignant_absent?.prenoms_enseignant}</td>
                                            <td>{r.remplacant
                                                ? `${r.remplacant.nom_enseignant} ${r.remplacant.prenoms_enseignant}`
                                                : <span className="text-muted fst-italic">Non affecté</span>}
                                            </td>
                                            <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                                            <td className="text-end">
                                                <NavLink to={`/DetailsRemplacement/${r.id}`} className="btn btn-sm btn-outline-primary me-1">
                                                    <i className="fas fa-pen" />
                                                </NavLink>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(r.id)}>
                                                    <i className="fas fa-trash" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListeRemplacements;
