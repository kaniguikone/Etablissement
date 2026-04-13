import React, { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { TYPES } from './ListeSanctions';

const SanctionsEleve = () => {
    const { id } = useParams();
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [data, setData]             = useState(null);
    const [chargement, setChargement] = useState(true);

    const charger = () => {
        setChargement(true);
        api.get(`/sanctions/eleve/${id}`)
            .then(r => { setData(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les sanctions.'); setChargement(false); });
    };

    useEffect(() => { charger(); }, [id]);

    const supprimer = async (sid) => {
        if (!await confirmer('Supprimer cette sanction ?')) return;
        api.delete(`/sanctions/${sid}`).then(charger).catch(() => toast.error('Erreur suppression.'));
    };

    const notifier = async (sid) => {
        try {
            await api.post(`/sanctions/${sid}/notifier`);
            toast.success('Parent notifié.');
            charger();
        } catch {
            toast.error('Impossible d\'envoyer la notification.');
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        const [a, m, j] = d.split('T')[0].split('-');
        return `${j}/${m}/${a}`;
    };

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
    if (!data) return null;

    const { eleve, sanctions, stats } = data;

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-gavel me-2 text-danger" />
                        Sanctions — {eleve.nom_eleve} {eleve.prenoms_eleve}
                        <small className="text-muted ms-2 fs-6">{eleve.matricule_eleve}</small>
                    </h4>
                    <div className="d-flex gap-2">
                        <NavLink to={`/NouvelleSanction?eleve_id=${id}`} className="btn btn-primary btn-sm">
                            <i className="fas fa-plus me-1" />Nouvelle sanction
                        </NavLink>
                        <NavLink to="/Sanctions" className="btn btn-secondary btn-sm">Retour</NavLink>
                    </div>
                </div>

                {/* Stats rapides */}
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card border-danger text-center">
                            <div className="card-body py-2">
                                <div className="text-muted small">Total sanctions</div>
                                <h5 className="mb-0 text-danger">{stats.total}</h5>
                            </div>
                        </div>
                    </div>
                    {Object.entries(stats.par_type || {}).map(([type, count]) => (
                        <div key={type} className="col-md-3 mb-2">
                            <div className={`card text-center`}>
                                <div className="card-body py-2">
                                    <div className="text-muted small">{TYPES[type]?.label ?? type}</div>
                                    <h5 className="mb-0">{count}</h5>
                                </div>
                            </div>
                        </div>
                    ))}
                    {stats.non_notifies > 0 && (
                        <div className="col-md-3">
                            <div className="card border-warning text-center">
                                <div className="card-body py-2">
                                    <div className="text-muted small">Parents non notifiés</div>
                                    <h5 className="mb-0 text-warning">{stats.non_notifies}</h5>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Classe & niveau */}
                <div className="mb-3 text-muted small">
                    <i className="fas fa-school me-1" />
                    {eleve.classe?.nom_classe}
                    {eleve.classe?.niveau && <span className="ms-2">· {eleve.classe.niveau.libelle_niveau}</span>}
                </div>

                {sanctions.length === 0 ? (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2" />
                        Aucune sanction enregistrée pour cet élève.
                    </div>
                ) : (
                    <div className="list-group">
                        {sanctions.map(s => {
                            const t = TYPES[s.type];
                            return (
                                <div key={s.id} className="list-group-item list-group-item-action d-flex gap-3 align-items-start">
                                    {/* Pastille couleur */}
                                    <div className="pt-1">
                                        <span className={`badge ${t?.cls} p-2`} style={{ minWidth: 120, textAlign: 'center' }}>
                                            <i className={`${t?.icon} me-1`} />{t?.label}
                                        </span>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <strong>{s.motif}</strong>
                                                <div className="text-muted small mt-1">
                                                    <i className="fas fa-calendar me-1" />{formatDate(s.date_sanction)}
                                                    {s.date_fin && <span className="ms-2">→ {formatDate(s.date_fin)}</span>}
                                                    {s.prononcee_par && <span className="ms-2">· Par {s.prononcee_par}</span>}
                                                </div>
                                                {s.description && (
                                                    <div className="text-muted small mt-1 fst-italic">{s.description}</div>
                                                )}
                                            </div>
                                            <div className="d-flex gap-1 ms-2">
                                                {!s.parent_notifie ? (
                                                    <button className="btn btn-sm btn-outline-warning" onClick={() => notifier(s.id)} title="Notifier le parent">
                                                        <i className="fas fa-bell" />
                                                    </button>
                                                ) : (
                                                    <span className="btn btn-sm btn-outline-success disabled" title="Parent notifié">
                                                        <i className="fas fa-check" />
                                                    </span>
                                                )}
                                                <NavLink to={`/DetailsSanction/${s.id}`} className="btn btn-sm btn-outline-primary">
                                                    <i className="fas fa-pen" />
                                                </NavLink>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(s.id)}>
                                                    <i className="fas fa-trash" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SanctionsEleve;
