import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export const TYPES = {
    avertissement:  { label: 'Avertissement',         cls: 'bg-warning text-dark', icon: 'fas fa-exclamation-triangle' },
    blame:          { label: 'Blâme',                  cls: 'bg-orange text-white',  icon: 'fas fa-ban' },
    exclusion_temp: { label: 'Exclusion temporaire',   cls: 'bg-danger',             icon: 'fas fa-user-slash' },
    exclusion_def:  { label: 'Exclusion définitive',   cls: 'bg-dark',               icon: 'fas fa-user-times' },
    convocation:    { label: 'Convocation',            cls: 'bg-info text-dark',     icon: 'fas fa-envelope' },
    autre:          { label: 'Autre',                  cls: 'bg-secondary',          icon: 'fas fa-file-alt' },
};

const ListeSanctions = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();

    const [sanctions, setSanctions] = useState([]);
    const [classes, setClasses]     = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage]   = useState(1);
    const [total, setTotal]         = useState(0);
    const [filtreClasse, setFiltreClasse] = useState('');
    const [filtreType, setFiltreType]     = useState('');
    const [recherche, setRecherche]       = useState('');
    const [chargement, setChargement]     = useState(true);

    useEffect(() => {
        api.get('/classesTout').then(r => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        charger(1, '', '', '');
    }, [location.key]);

    const charger = (page, classe, type, search) => {
        setChargement(true);
        const p = new URLSearchParams({ page });
        if (classe) p.append('classe_id', classe);
        if (type)   p.append('type', type);
        if (search) p.append('search', search);

        api.get(`/sanctions?${p}`)
            .then(r => {
                setSanctions(r.data.data);
                setCurrentPage(r.data.current_page);
                setLastPage(r.data.last_page);
                setTotal(r.data.total);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les sanctions.'); setChargement(false); });
    };

    const supprimer = async (id) => {
        if (!await confirmer('Supprimer cette sanction ?')) return;
        api.delete(`/sanctions/${id}`)
            .then(() => charger(currentPage, filtreClasse, filtreType, recherche))
            .catch(() => toast.error('Impossible de supprimer cette sanction.'));
    };

    const notifier = async (id) => {
        try {
            await api.post(`/sanctions/${id}/notifier`);
            toast.success('Parent notifié.');
            charger(currentPage, filtreClasse, filtreType, recherche);
        } catch {
            toast.error('Impossible d\'envoyer la notification.');
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        const [a, m, j] = d.slice(0, 10).split('-');
        return `${j}/${m}/${a}`;
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-gavel me-2 text-danger" />
                        Sanctions &amp; comportement
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{total}</span>
                    </h4>
                    <NavLink to="/NouvelleSanction" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouvelle sanction
                    </NavLink>
                </div>

                {/* Filtres */}
                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher un élève…"
                            value={recherche}
                            onChange={e => { setRecherche(e.target.value); charger(1, filtreClasse, filtreType, e.target.value); }}
                        />
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select form-select-sm"
                            value={filtreClasse}
                            onChange={e => { setFiltreClasse(e.target.value); charger(1, e.target.value, filtreType, recherche); }}
                        >
                            <option value="">Toutes les classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select form-select-sm"
                            value={filtreType}
                            onChange={e => { setFiltreType(e.target.value); charger(1, filtreClasse, e.target.value, recherche); }}
                        >
                            <option value="">Tous les types</option>
                            {Object.entries(TYPES).map(([v, t]) => (
                                <option key={v} value={v}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {chargement ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : (
                    <table className="table table-striped table-sm table-hover">
                        <thead className="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Élève</th>
                                <th>Classe</th>
                                <th>Type</th>
                                <th>Motif</th>
                                <th>Prononcée par</th>
                                <th>Parent notifié</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sanctions.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-muted py-4">Aucune sanction enregistrée.</td></tr>
                            )}
                            {sanctions.map(s => {
                                const t = TYPES[s.type];
                                return (
                                    <tr key={s.id}>
                                        <td className="text-nowrap">{formatDate(s.date_sanction)}</td>
                                        <td>
                                            <NavLink to={`/SanctionsEleve/${s.eleve_id}`} className="text-decoration-none fw-semibold">
                                                {s.eleve?.nom_eleve} {s.eleve?.prenoms_eleve}
                                            </NavLink>
                                        </td>
                                        <td className="text-muted small">{s.eleve?.classe?.nom_classe}</td>
                                        <td>
                                            <span className={`badge ${t?.cls}`} style={{ fontSize: 11 }}>
                                                <i className={`${t?.icon} me-1`} />{t?.label}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: 220 }}>
                                            <span title={s.description || ''} style={{ cursor: s.description ? 'help' : 'default' }}>
                                                {s.motif}
                                            </span>
                                        </td>
                                        <td className="text-muted small">{s.prononcee_par || '—'}</td>
                                        <td className="text-center">
                                            {s.parent_notifie ? (
                                                <i className="fas fa-check-circle text-success" title="Parent notifié" />
                                            ) : (
                                                <button
                                                    className="btn btn-xs btn-outline-warning py-0 px-1"
                                                    style={{ fontSize: 11 }}
                                                    onClick={() => notifier(s.id)}
                                                    title="Notifier le parent maintenant"
                                                >
                                                    <i className="fas fa-bell me-1" />Notifier
                                                </button>
                                            )}
                                        </td>
                                        <td className="text-nowrap">
                                            <NavLink to={`/DetailsSanction/${s.id}`} className="btn btn-warning btn-sm me-1">
                                                <i className="fas fa-pen" />
                                            </NavLink>
                                            <button className="btn btn-danger btn-sm" onClick={() => supprimer(s.id)}>
                                                <i className="fas fa-trash" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                <Pagination
                    currentPage={currentPage}
                    lastPage={lastPage}
                    onPageChange={p => charger(p, filtreClasse, filtreType, recherche)}
                />
            </div>
        </section>
    );
};

export default ListeSanctions;
