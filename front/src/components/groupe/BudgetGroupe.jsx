import React, { useEffect, useState } from 'react';
import { centralApi } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = {
    soumise:   { label: 'Soumise',   cls: 'bg-warning text-dark' },
    approuvee: { label: 'Approuvée', cls: 'bg-success' },
    rejetee:   { label: 'Rejetée',   cls: 'bg-danger' },
};

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const fmtK = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
    return String(Math.round(n));
};

export default function BudgetGroupe() {
    const { toast } = useToast();

    const [demandes, setDemandes]   = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('soumise');

    const [modalDecision, setModalDecision] = useState(null); // { demande, type }
    const [montantOctroye, setMontantOctroye] = useState('');
    const [commentaire, setCommentaire] = useState('');

    const [modalDelegation, setModalDelegation] = useState(null); // { ecole }
    const [delegables, setDelegables] = useState([]);
    const [delegueChoisi, setDelegueChoisi] = useState('');
    const [chargementDelegables, setChargementDelegables] = useState(false);

    const charger = () => {
        setChargement(true);
        const params = filtreStatut ? `?statut=${filtreStatut}` : '';
        Promise.all([
            centralApi.get(`/group/budget/dotations${params}`),
            centralApi.get('/group/budget/dashboard'),
        ]).then(([rd, rdb]) => { setDemandes(rd.data); setDashboard(rdb.data); })
          .catch(() => toast.error('Erreur lors du chargement.'))
          .finally(() => setChargement(false));
    };

    useEffect(() => { charger(); }, [filtreStatut]);

    const ouvrirDecision = (demande, type) => {
        setModalDecision({ demande, type });
        setMontantOctroye(demande.montant_demande);
        setCommentaire('');
    };

    const confirmerDecision = async () => {
        const { demande, type } = modalDecision;
        try {
            if (type === 'approuver') {
                await centralApi.put(`/group/ecoles/${demande.tenant_id}/budget/dotations/${demande.id}/approuver`, { montant_octroye: montantOctroye });
                toast.success('Demande approuvée.');
            } else {
                await centralApi.put(`/group/ecoles/${demande.tenant_id}/budget/dotations/${demande.id}/rejeter`, { commentaire_validation: commentaire });
                toast.success('Demande rejetée.');
            }
            setModalDecision(null);
            charger();
        } catch (err) {
            toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la décision.");
        }
    };

    const toggleDelegation = async (ecole) => {
        if (ecole.budget_delegation_active) {
            // Désactivation : pas besoin de choisir qui, on retire simplement la délégation.
            try {
                await centralApi.put(`/group/ecoles/${ecole.id}/budget/delegation`, { actif: false });
                toast.success('Délégation retirée.');
                charger();
            } catch { toast.error('Erreur lors de la mise à jour de la délégation.'); }
            return;
        }

        // Activation : la DG doit désigner précisément qui, parmi les utilisateurs de l'établissement.
        setModalDelegation({ ecole });
        setDelegueChoisi('');
        setChargementDelegables(true);
        try {
            const r = await centralApi.get(`/group/ecoles/${ecole.id}/budget/delegables`);
            setDelegables(r.data);
        } catch {
            toast.error('Impossible de charger la liste des utilisateurs de cet établissement.');
        } finally {
            setChargementDelegables(false);
        }
    };

    const confirmerDelegation = async () => {
        if (!delegueChoisi) return;
        try {
            await centralApi.put(`/group/ecoles/${modalDelegation.ecole.id}/budget/delegation`, {
                actif: true,
                user_id: delegueChoisi,
            });
            toast.success('Approbation déléguée.');
            setModalDelegation(null);
            charger();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de la délégation.');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-hand-holding-usd me-2 text-warning" />
                    Budget des établissements
                </h4>
                <p className="text-muted small mb-0">Demandes de dotation et suivi consolidé du budget de chaque établissement</p>
            </div>

            {dashboard && (
                <div className="row g-3 mb-4">
                    {[
                        { l: 'Octroyé (groupe)', v: fmtK(dashboard.totaux.octroye) + ' F', c: '#10b981', i: 'fas fa-cash-register' },
                        { l: 'Dépensé (groupe)', v: fmtK(dashboard.totaux.depense) + ' F', c: '#ef4444', i: 'fas fa-cart-arrow-down' },
                        { l: 'Solde (groupe)',   v: fmtK(dashboard.totaux.solde)   + ' F', c: '#3b82f6', i: 'fas fa-wallet' },
                    ].map(x => (
                        <div key={x.l} className="col-12 col-md-4">
                            <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                <div className="card-body py-3 d-flex align-items-center gap-3">
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: x.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={x.i} style={{ color: x.c, fontSize: 16 }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: x.c }}>{x.v}</div>
                                        <div style={{ fontSize: 11, color: '#6c757d' }}>{x.l}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Par établissement + délégation */}
            {dashboard && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white border-0 pt-3 pb-2">
                        <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Par établissement
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Établissement</th>
                                    <th className="text-end">Octroyé</th>
                                    <th className="text-end">Dépensé</th>
                                    <th className="text-end">Solde</th>
                                    <th>Approbation déléguée</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.ecoles.map(e => (
                                    <tr key={e.id}>
                                        <td className="fw-semibold">{e.nom}</td>
                                        <td className="text-end text-success">{fmt(e.octroye)} F</td>
                                        <td className="text-end text-danger">{fmt(e.depense)} F</td>
                                        <td className="text-end fw-semibold">{fmt(e.solde)} F</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="form-check form-switch mb-0" title="Déléguer l'approbation à une personne de cet établissement">
                                                    <input className="form-check-input" type="checkbox"
                                                        checked={e.budget_delegation_active}
                                                        onChange={() => toggleDelegation(e)} />
                                                </div>
                                                {e.budget_delegation_active && e.budget_delegue_nom && (
                                                    <span className="badge bg-light text-dark border">
                                                        <i className="fas fa-user-check me-1 text-success" />{e.budget_delegue_nom}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Demandes */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2 d-flex align-items-center gap-2">
                    <label className="form-label small mb-0">Statut :</label>
                    <select className="form-select form-select-sm" style={{ width: 200 }}
                        value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <span className="text-muted small ms-auto">{demandes.length} demande(s)</span>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : demandes.length === 0 ? (
                <div className="alert alert-info text-center">Aucune demande de budget.</div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Référence</th>
                                    <th>Établissement</th>
                                    <th>Demandeur</th>
                                    <th className="text-end">Montant demandé</th>
                                    <th className="text-center">Statut</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {demandes.map(d => (
                                    <tr key={`${d.tenant_id}-${d.id}`}>
                                        <td className="fw-semibold">{d.reference}</td>
                                        <td>{d.tenant_nom}</td>
                                        <td>{d.demandeur?.name ?? '—'}</td>
                                        <td className="text-end">{fmt(d.montant_demande)} F</td>
                                        <td className="text-center">
                                            <span className={`badge ${STATUTS[d.statut]?.cls ?? 'bg-secondary'}`}>
                                                {STATUTS[d.statut]?.label ?? d.statut}
                                            </span>
                                        </td>
                                        <td>
                                            {d.statut === 'soumise' && (
                                                <div className="d-flex gap-1 justify-content-end">
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => ouvrirDecision(d, 'approuver')}>
                                                        <i className="fas fa-check" />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => ouvrirDecision(d, 'rejeter')}>
                                                        <i className="fas fa-times" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalDelegation && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Déléguer l&apos;approbation — {modalDelegation.ecole.nom}</h5>
                                <button className="btn-close" onClick={() => setModalDelegation(null)} />
                            </div>
                            <div className="modal-body">
                                <p className="text-muted small">
                                    Choisissez la personne de cet établissement habilitée à approuver/rejeter
                                    ses demandes de budget à votre place. Vous gardez la main : vous pourrez
                                    toujours approuver vous-même depuis cet écran.
                                </p>
                                {chargementDelegables ? (
                                    <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" /></div>
                                ) : delegables.length === 0 ? (
                                    <div className="alert alert-warning small mb-0">Aucun utilisateur actif trouvé dans cet établissement.</div>
                                ) : (
                                    <select className="form-select" value={delegueChoisi} onChange={e => setDelegueChoisi(e.target.value)}>
                                        <option value="">— Choisir une personne —</option>
                                        {delegables.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}{u.role ? ` (${u.role})` : ''}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary" onClick={() => setModalDelegation(null)}>Annuler</button>
                                <button className="btn btn-primary" disabled={!delegueChoisi} onClick={confirmerDelegation}>
                                    Déléguer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalDecision && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalDecision.type === 'approuver' ? 'Approuver' : 'Rejeter'} la demande {modalDecision.demande.reference} — {modalDecision.demande.tenant_nom}
                                </h5>
                                <button className="btn-close" onClick={() => setModalDecision(null)} />
                            </div>
                            <div className="modal-body">
                                {modalDecision.type === 'approuver' ? (
                                    <div className="mb-1">
                                        <label className="form-label">Montant octroyé (FCFA)</label>
                                        <input type="number" min="1" className="form-control"
                                            value={montantOctroye} onChange={e => setMontantOctroye(e.target.value)} />
                                    </div>
                                ) : (
                                    <div className="mb-1">
                                        <label className="form-label">Motif du rejet <span className="text-danger">*</span></label>
                                        <textarea rows={3} className="form-control" value={commentaire}
                                            onChange={e => setCommentaire(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary" onClick={() => setModalDecision(null)}>Annuler</button>
                                <button
                                    className={`btn ${modalDecision.type === 'approuver' ? 'btn-success' : 'btn-danger'}`}
                                    disabled={modalDecision.type === 'rejeter' && !commentaire.trim()}
                                    onClick={confirmerDecision}>
                                    {modalDecision.type === 'approuver' ? 'Approuver' : 'Rejeter'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
