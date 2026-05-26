import { useEffect, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const TYPES    = ['Note', 'Paiement', 'Sanction'];
const ACTIONS  = ['create', 'update', 'delete'];
const LABEL_ACTION = { create: 'Création', update: 'Modification', delete: 'Suppression' };
const BADGE_ACTION = {
    create: 'bg-success',
    update: 'bg-warning text-dark',
    delete: 'bg-danger',
};
const LABEL_TYPE = { Note: 'Note', Paiement: 'Paiement', Sanction: 'Sanction' };

const formatValeur = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
    return String(val);
};

const DiffCellule = ({ old: oldVals, nouveau: newVals, action }) => {
    if (action === 'create') {
        return (
            <span className="text-muted small">
                {Object.entries(newVals || {}).map(([k, v]) => (
                    <span key={k} className="me-2"><strong>{k}</strong> : {formatValeur(v)}</span>
                ))}
            </span>
        );
    }
    if (action === 'delete') {
        return (
            <span className="text-muted small">
                {Object.entries(oldVals || {}).map(([k, v]) => (
                    <span key={k} className="me-2"><strong>{k}</strong> : {formatValeur(v)}</span>
                ))}
            </span>
        );
    }
    return (
        <span className="small">
            {Object.entries(newVals || {}).map(([k, v]) => (
                <span key={k} className="me-3">
                    <strong>{k}</strong> :&nbsp;
                    <span className="text-danger">{formatValeur(oldVals?.[k])}</span>
                    <span className="mx-1">→</span>
                    <span className="text-success">{formatValeur(v)}</span>
                </span>
            ))}
        </span>
    );
};

const AuditLogs = () => {
    const { toast } = useToast();

    const [logs,        setLogs]        = useState([]);
    const [meta,        setMeta]        = useState(null);
    const [page,        setPage]        = useState(1);
    const [chargement,  setChargement]  = useState(false);
    const [filtres, setFiltres] = useState({ type: '', action: '', search: '', from: '', to: '' });

    const charger = useCallback(async (p = 1, f = filtres) => {
        setChargement(true);
        try {
            const params = { page: p, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
            const r = await api.get('/audit-logs', { params });
            setLogs(r.data.data);
            setMeta(r.data);
            setPage(p);
        } catch {
            toast.error('Impossible de charger le journal d\'audit.');
        } finally {
            setChargement(false);
        }
    }, [filtres]);

    useEffect(() => { charger(1, filtres); }, []);

    const appliquerFiltres = (e) => { e.preventDefault(); charger(1, filtres); };

    const changerFiltre = (key, val) => {
        const nv = { ...filtres, [key]: val };
        setFiltres(nv);
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-history me-2 text-secondary" />
                        Journal d&apos;audit
                    </h4>
                    <NavLink to="/Utilisateurs" className="btn btn-secondary btn-sm">Retour</NavLink>
                </div>

                {/* Filtres */}
                <form onSubmit={appliquerFiltres} className="row g-2 mb-3 align-items-end">
                    <div className="col-md-2">
                        <label className="form-label small fw-semibold mb-1">Type</label>
                        <select className="form-select form-select-sm" value={filtres.type} onChange={e => changerFiltre('type', e.target.value)}>
                            <option value="">Tous</option>
                            {TYPES.map(t => <option key={t} value={t}>{LABEL_TYPE[t]}</option>)}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small fw-semibold mb-1">Action</label>
                        <select className="form-select form-select-sm" value={filtres.action} onChange={e => changerFiltre('action', e.target.value)}>
                            <option value="">Toutes</option>
                            {ACTIONS.map(a => <option key={a} value={a}>{LABEL_ACTION[a]}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-semibold mb-1">Utilisateur</label>
                        <input type="text" className="form-control form-control-sm" placeholder="Nom…"
                            value={filtres.search} onChange={e => changerFiltre('search', e.target.value)} />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small fw-semibold mb-1">Du</label>
                        <input type="date" className="form-control form-control-sm"
                            value={filtres.from} onChange={e => changerFiltre('from', e.target.value)} />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label small fw-semibold mb-1">Au</label>
                        <input type="date" className="form-control form-control-sm"
                            value={filtres.to} onChange={e => changerFiltre('to', e.target.value)} />
                    </div>
                    <div className="col-md-1">
                        <button type="submit" className="btn btn-primary btn-sm w-100">
                            <i className="fas fa-search" />
                        </button>
                    </div>
                </form>

                {chargement && (
                    <div className="text-center py-4"><div className="spinner-border text-secondary" /></div>
                )}

                {!chargement && logs.length === 0 && (
                    <div className="alert alert-info text-center">Aucune entrée pour ces critères.</div>
                )}

                {!chargement && logs.length > 0 && (
                    <>
                        <div className="table-responsive">
                            <table className="table table-sm table-striped table-hover">
                                <thead className="table-secondary">
                                    <tr>
                                        <th style={{ width: 140 }}>Date</th>
                                        <th>Utilisateur</th>
                                        <th style={{ width: 110 }}>Action</th>
                                        <th style={{ width: 90 }}>Type</th>
                                        <th style={{ width: 60 }}>ID</th>
                                        <th>Modifications</th>
                                        <th style={{ width: 110 }}>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td className="text-muted small">
                                                {new Date(log.created_at).toLocaleString('fr-FR')}
                                            </td>
                                            <td className="fw-semibold small">{log.user_nom}</td>
                                            <td>
                                                <span className={`badge ${BADGE_ACTION[log.action]}`}>
                                                    {LABEL_ACTION[log.action]}
                                                </span>
                                            </td>
                                            <td className="small">{log.auditable_type}</td>
                                            <td className="text-muted small">{log.auditable_id}</td>
                                            <td>
                                                <DiffCellule
                                                    old={log.old_values}
                                                    nouveau={log.new_values}
                                                    action={log.action}
                                                />
                                            </td>
                                            <td className="text-muted small">{log.ip_address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {meta && meta.last_page > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className="text-muted small">
                                    {meta.total} entrée(s) — page {meta.current_page} / {meta.last_page}
                                </span>
                                <div className="btn-group btn-group-sm">
                                    <button className="btn btn-outline-secondary" disabled={page <= 1}
                                        onClick={() => charger(page - 1)}>‹ Précédent</button>
                                    <button className="btn btn-outline-secondary" disabled={page >= meta.last_page}
                                        onClick={() => charger(page + 1)}>Suivant ›</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default AuditLogs;
