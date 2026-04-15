import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const TYPES = {
    classe:     { label: 'Salle de classe', icon: 'fas fa-chalkboard',    cls: 'bg-primary' },
    labo:       { label: 'Laboratoire',     icon: 'fas fa-flask',          cls: 'bg-success' },
    salle_info: { label: 'Salle info',      icon: 'fas fa-desktop',        cls: 'bg-info text-dark' },
    gymnase:    { label: 'Gymnase',         icon: 'fas fa-running',        cls: 'bg-warning text-dark' },
    autre:      { label: 'Autre',           icon: 'fas fa-door-open',      cls: 'bg-secondary' },
};

const ListeSalles = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();

    const [salles, setSalles] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [filtreType, setFiltreType] = useState('');

    const charger = async () => {
        setChargement(true);
        try {
            const params = {};
            if (filtreType) params.type = filtreType;
            const { data } = await api.get('/salles', { params });
            setSalles(data);
        } catch {
            toast('Erreur lors du chargement des salles.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [filtreType, location.key]);

    const supprimer = async (salle) => {
        const ok = await confirmer(`Supprimer la salle "${salle.nom}" ?`);
        if (!ok) return;
        try {
            await api.delete(`/salles/${salle.id}`);
            toast('Salle supprimée.', 'success');
            charger();
        } catch (e) {
            toast(e.response?.data?.message || 'Erreur lors de la suppression.', 'danger');
        }
    };

    const toggleActif = async (salle) => {
        try {
            await api.put(`/salles/${salle.id}`, { ...salle, actif: !salle.actif });
            toast(`Salle ${!salle.actif ? 'activée' : 'désactivée'}.`, 'success');
            charger();
        } catch {
            toast('Erreur.', 'danger');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0"><i className="fas fa-door-open me-2 text-primary" />Salles</h4>
                <NavLink to="/NouvelleSalle" className="btn btn-primary">
                    <i className="fas fa-plus me-2" />Nouvelle salle
                </NavLink>
            </div>

            {/* Filtres */}
            <div className="card mb-4">
                <div className="card-body py-2">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label small mb-1">Type</label>
                            <select className="form-select form-select-sm" value={filtreType} onChange={e => setFiltreType(e.target.value)}>
                                <option value="">Tous les types</option>
                                {Object.entries(TYPES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
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
                                    <th>Salle</th>
                                    <th>Type</th>
                                    <th>Bâtiment</th>
                                    <th>Capacité</th>
                                    <th>Statut</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salles.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-muted">Aucune salle</td></tr>
                                ) : salles.map(s => {
                                    const t = TYPES[s.type] || TYPES.autre;
                                    return (
                                        <tr key={s.id}>
                                            <td className="fw-semibold">{s.nom}</td>
                                            <td>
                                                <span className={`badge ${t.cls}`}>
                                                    <i className={`${t.icon} me-1`} />{t.label}
                                                </span>
                                            </td>
                                            <td>{s.batiment || <span className="text-muted">—</span>}</td>
                                            <td>{s.capacite ? `${s.capacite} places` : <span className="text-muted">—</span>}</td>
                                            <td>
                                                <span className={`badge ${s.actif ? 'bg-success' : 'bg-secondary'}`}>
                                                    {s.actif ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <NavLink to={`/PlanningSalle/${s.id}`} className="btn btn-sm btn-outline-info me-1" title="Planning">
                                                    <i className="fas fa-calendar-week" />
                                                </NavLink>
                                                <NavLink to={`/DetailsSalle/${s.id}`} className="btn btn-sm btn-outline-primary me-1" title="Modifier">
                                                    <i className="fas fa-pen" />
                                                </NavLink>
                                                <button className="btn btn-sm btn-outline-secondary me-1" title={s.actif ? 'Désactiver' : 'Activer'} onClick={() => toggleActif(s)}>
                                                    <i className={`fas fa-${s.actif ? 'toggle-on' : 'toggle-off'}`} />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" title="Supprimer" onClick={() => supprimer(s)}>
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

export default ListeSalles;
