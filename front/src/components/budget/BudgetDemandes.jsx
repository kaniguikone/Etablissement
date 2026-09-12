import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const STATUTS = {
    brouillon: { label: 'Brouillon', cls: 'bg-secondary' },
    soumise:   { label: 'Soumise',   cls: 'bg-warning text-dark' },
    approuvee: { label: 'Approuvée', cls: 'bg-success' },
    rejetee:   { label: 'Rejetée',   cls: 'bg-danger' },
};

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const VIDE = { montant_demande: '', motif: '' };

export default function BudgetDemandes() {
    const { peutAcceder } = useAuth();
    const { toast }   = useToast();
    const { confirmer } = useConfirm();

    const peutGerer = peutAcceder(['budget_gestion']);

    // La permission budget_validation seule ne dit pas si CE compte peut vraiment
    // approuver : pour un établissement de groupe, c'est la désignation de la DG
    // (tenants.budget_delegue_user_id) qui décide — un rôle "super" bypasserait la
    // permission côté front sans que le serveur n'accepte l'action pour autant.
    // On demande donc la réponse réelle au serveur plutôt que de deviner ici.
    const [autorisationValidation, setAutorisationValidation] = useState({ autorise: false, motif: null });

    const [annees, setAnnees]       = useState([]);
    const [anneeId, setAnneeId]     = useState('');
    const [dotations, setDotations] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('');

    const [modal, setModal] = useState(false);
    const [form, setForm]   = useState(VIDE);
    const [erreurs, setErreurs] = useState({});
    const [sauvegarde, setSauvegarde] = useState(false);

    const [modalDecision, setModalDecision] = useState(null); // { dotation, type: 'approuver'|'rejeter' }
    const [montantOctroye, setMontantOctroye] = useState('');
    const [commentaire, setCommentaire] = useState('');

    useEffect(() => {
        api.get('/annees-scolaires').then(r => {
            setAnnees(r.data);
            const enCours = r.data.find(a => a.statut === 'en_cours');
            setAnneeId(String((enCours ?? r.data[0])?.id ?? ''));
        }).catch(() => toast.error('Erreur lors du chargement des années scolaires.'));

        api.get('/budget/peut-valider')
            .then(r => setAutorisationValidation(r.data))
            .catch(() => setAutorisationValidation({ autorise: false, motif: null }));
    }, []);

    const charger = () => {
        setChargement(true);
        const params = filtreStatut ? `?statut=${filtreStatut}` : '';
        api.get(`/budget/dotations${params}`)
            .then(r => setDotations(r.data))
            .catch(() => toast.error('Erreur lors du chargement des demandes.'))
            .finally(() => setChargement(false));
    };

    useEffect(() => { charger(); }, [filtreStatut]);

    const ouvrirCreation = () => {
        setForm(VIDE);
        setErreurs({});
        setModal(true);
    };

    const valider = () => {
        const e = {};
        if (!form.montant_demande || isNaN(form.montant_demande) || Number(form.montant_demande) < 1)
            e.montant_demande = 'Montant invalide';
        if (!form.motif.trim()) e.motif = 'Motif requis';
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const enregistrer = async (e, soumettre) => {
        e.preventDefault();
        if (!valider()) return;
        setSauvegarde(true);
        try {
            await api.post('/budget/dotations', {
                ...form,
                annee_scolaire_id: anneeId,
                soumettre,
            });
            toast.success(soumettre ? 'Demande soumise à validation.' : 'Brouillon enregistré.');
            setModal(false);
            charger();
        } catch (err) {
            if (err.response?.data?.errors) setErreurs(err.response.data.errors);
            else toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement.");
        } finally { setSauvegarde(false); }
    };

    const soumettre = async (d) => {
        const ok = await confirmer(`Soumettre la demande ${d.reference} ? Elle ne pourra plus être modifiée après soumission.`);
        if (!ok) return;
        try {
            await api.put(`/budget/dotations/${d.id}/soumettre`);
            toast.success('Demande soumise.');
            charger();
        } catch { toast.error('Erreur lors de la soumission.'); }
    };

    const supprimer = async (d) => {
        const ok = await confirmer(`Supprimer le brouillon ${d.reference} ? Cette action est irréversible.`);
        if (!ok) return;
        try {
            await api.delete(`/budget/dotations/${d.id}`);
            toast.success('Brouillon supprimé.');
            charger();
        } catch { toast.error('Erreur lors de la suppression.'); }
    };

    const ouvrirDecision = (dotation, type) => {
        setModalDecision({ dotation, type });
        setMontantOctroye(dotation.montant_demande);
        setCommentaire('');
    };

    const confirmerDecision = async () => {
        const { dotation, type } = modalDecision;
        try {
            if (type === 'approuver') {
                await api.put(`/budget/dotations/${dotation.id}/approuver`, { montant_octroye: montantOctroye });
                toast.success('Demande approuvée.');
            } else {
                await api.put(`/budget/dotations/${dotation.id}/rejeter`, { commentaire_validation: commentaire });
                toast.success('Demande rejetée.');
            }
            setModalDecision(null);
            charger();
        } catch (err) {
            toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la décision.");
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Demandes de budget</h4>
                    <small className="text-muted">Demande de dotation et validation par la Direction Générale</small>
                </div>
                {peutGerer && (
                    <button className="btn btn-primary" onClick={ouvrirCreation}>
                        <i className="fas fa-plus me-1" /> Nouvelle demande
                    </button>
                )}
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="row g-2 align-items-center">
                        <div className="col-auto">
                            <label className="form-label small mb-0 me-2">Statut :</label>
                        </div>
                        <div className="col-auto">
                            <select className="form-select form-select-sm" value={filtreStatut}
                                onChange={e => setFiltreStatut(e.target.value)}>
                                <option value="">Tous les statuts</option>
                                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div className="col">
                            <span className="text-muted small">{dotations.length} demande(s)</span>
                        </div>
                    </div>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : dotations.length === 0 ? (
                <div className="alert alert-info text-center">Aucune demande de budget.</div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Référence</th>
                                    <th>Demandeur</th>
                                    <th>Motif</th>
                                    <th className="text-end">Montant demandé</th>
                                    <th className="text-end">Montant octroyé</th>
                                    <th className="text-center">Statut</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {dotations.map(d => (
                                    <tr key={d.id}>
                                        <td className="fw-semibold">{d.reference}</td>
                                        <td>{d.demandeur?.name ?? '—'}</td>
                                        <td className="text-muted small" style={{ maxWidth: 260 }}>{d.motif}</td>
                                        <td className="text-end">{fmt(d.montant_demande)} F</td>
                                        <td className="text-end fw-semibold text-success">
                                            {d.montant_octroye ? fmt(d.montant_octroye) + ' F' : '—'}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${STATUTS[d.statut]?.cls ?? 'bg-secondary'}`}>
                                                {STATUTS[d.statut]?.label ?? d.statut}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end">
                                                {peutGerer && d.statut === 'brouillon' && (
                                                    <>
                                                        <button className="btn btn-sm btn-outline-primary" onClick={() => soumettre(d)} title="Soumettre">
                                                            <i className="fas fa-paper-plane" />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(d)} title="Supprimer">
                                                            <i className="fas fa-trash" />
                                                        </button>
                                                    </>
                                                )}
                                                {autorisationValidation.autorise && d.statut === 'soumise' && (
                                                    <>
                                                        <button className="btn btn-sm btn-outline-success" onClick={() => ouvrirDecision(d, 'approuver')} title="Approuver">
                                                            <i className="fas fa-check" />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => ouvrirDecision(d, 'rejeter')} title="Rejeter">
                                                            <i className="fas fa-times" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {!autorisationValidation.autorise && d.statut === 'soumise' && autorisationValidation.motif && (
                                                <div className="text-muted small mt-1 text-end">
                                                    <i className="fas fa-lock me-1" />{autorisationValidation.motif}
                                                </div>
                                            )}
                                            {d.statut === 'rejetee' && d.commentaire_validation && (
                                                <div className="text-danger small mt-1">{d.commentaire_validation}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal création */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Nouvelle demande de budget</h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={e => enregistrer(e, true)}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Année scolaire</label>
                                        <select className="form-select" value={anneeId} onChange={e => setAnneeId(e.target.value)}>
                                            {annees.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Montant demandé (FCFA) <span className="text-danger">*</span></label>
                                        <input type="number" min="1" className={`form-control ${erreurs.montant_demande ? 'is-invalid' : ''}`}
                                            value={form.montant_demande} onChange={e => setForm(f => ({ ...f, montant_demande: e.target.value }))} />
                                        {erreurs.montant_demande && <div className="invalid-feedback">{erreurs.montant_demande}</div>}
                                    </div>
                                    <div className="mb-1">
                                        <label className="form-label">Motif <span className="text-danger">*</span></label>
                                        <textarea rows={3} className={`form-control ${erreurs.motif ? 'is-invalid' : ''}`}
                                            value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} />
                                        {erreurs.motif && <div className="invalid-feedback">{erreurs.motif}</div>}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(false)}>Annuler</button>
                                    <button type="button" className="btn btn-outline-primary" disabled={sauvegarde}
                                        onClick={e => enregistrer(e, false)}>Enregistrer en brouillon</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde ? <><span className="spinner-border spinner-border-sm me-2" />Envoi…</> : 'Soumettre à validation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal décision (approuver / rejeter) */}
            {modalDecision && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalDecision.type === 'approuver' ? 'Approuver' : 'Rejeter'} la demande {modalDecision.dotation.reference}
                                </h5>
                                <button className="btn-close" onClick={() => setModalDecision(null)} />
                            </div>
                            <div className="modal-body">
                                {modalDecision.type === 'approuver' ? (
                                    <div className="mb-1">
                                        <label className="form-label">Montant octroyé (FCFA)</label>
                                        <input type="number" min="1" className="form-control"
                                            value={montantOctroye} onChange={e => setMontantOctroye(e.target.value)} />
                                        <small className="text-muted">Peut différer du montant demandé ({fmt(modalDecision.dotation.montant_demande)} F).</small>
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
