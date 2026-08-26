import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const MODES = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', cinetpay: 'CinetPay', autre: 'Autre' };
const RETOUR_URL = window.location.origin + '/PaiementRetour';

const STATUT = {
    soldé:   { cls: 'bg-success', label: 'Soldé' },
    partiel: { cls: 'bg-warning text-dark', label: 'Partiel' },
    impayé:  { cls: 'bg-danger', label: 'Impayé' },
};

const FORM_VIDE = { frais_annexe_id: '', montant_paye: '', date_paiement: new Date().toISOString().slice(0, 10), mode_paiement: 'especes', reference_paiement: '', remarque: '' };

export default function FraisAnnexeEleve() {
    const { eleveId }           = useParams();
    const navigate              = useNavigate();
    const { toast }             = useToast();
    const { confirm }           = useConfirm();
    const [annees, setAnnees]   = useState([]);
    const [annee, setAnnee]     = useState('');
    const [data, setData]       = useState(null);
    const [chargement, setChargement] = useState(true);
    const [modal, setModal]     = useState(false);
    const [form, setForm]       = useState(FORM_VIDE);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [erreurs, setErreurs] = useState({});
    const [paiementEnLigneId, setPaiementEnLigneId] = useState(null);

    const charger = async (a = annee) => {
        setChargement(true);
        try {
            const params = a ? `?annee=${a}` : '';
            const r = await api.get(`/frais-annexes/eleve/${eleveId}${params}`);
            setData(r.data);
        } catch { toast.error('Impossible de charger les frais.'); }
        finally { setChargement(false); }
    };

    useEffect(() => {
        // Charger d'abord sans filtre pour récupérer toutes les années disponibles
        api.get(`/frais-annexes`).then(r => {
            const ans = [...new Set(r.data.map(f => f.annee))].sort().reverse();
            setAnnees(ans);
            const courante = ans[0] ?? '';
            setAnnee(courante);
            charger(courante);
        }).catch(() => charger(''));
    }, [eleveId]);

    const ouvrirPaiement = (fraisId = '') => {
        setForm({ ...FORM_VIDE, frais_annexe_id: fraisId });
        setErreurs({});
        setModal(true);
    };

    const valider = () => {
        const e = {};
        if (!form.frais_annexe_id)    e.frais_annexe_id = 'Sélectionner un frais';
        if (!form.montant_paye || isNaN(form.montant_paye) || Number(form.montant_paye) < 1)
                                      e.montant_paye    = 'Montant invalide';
        if (!form.date_paiement)      e.date_paiement   = 'Date requise';
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const enregistrer = async (e) => {
        e.preventDefault();
        if (!valider()) return;
        setSauvegarde(true);
        try {
            await api.post('/paiements-frais-annexes', { ...form, eleve_id: eleveId });
            toast.success('Paiement enregistré.');
            setModal(false);
            charger();
        } catch (err) {
            if (err.response?.data?.errors) setErreurs(err.response.data.errors);
            else toast.error('Erreur lors de l\'enregistrement.');
        } finally { setSauvegarde(false); }
    };

    const supprimerPaiement = async (p) => {
        const ok = await confirm(
            `Supprimer ce paiement de ${Number(p.montant_paye).toLocaleString('fr-FR')} FCFA ?`,
            'Cette action est irréversible.'
        );
        if (!ok) return;
        try {
            await api.delete(`/paiements-frais-annexes/${p.id}`);
            toast.success('Paiement supprimé.');
            charger();
        } catch { toast.error('Impossible de supprimer ce paiement.'); }
    };

    const payerEnLigne = (fraisId) => {
        setPaiementEnLigneId(fraisId);
        api.post(`/paiements-frais-annexes/initier`, {
            eleve_id:         eleveId,
            frais_annexe_id:  fraisId,
            return_url:       RETOUR_URL,
        })
        .then((r) => { window.open(r.data.payment_url, '_blank'); })
        .catch(() => toast.error('Impossible d\'initier le paiement. Vérifiez la configuration CinetPay.'))
        .finally(() => setPaiementEnLigneId(null));
    };

    const telechargerRecu = (paiementId) => {
        api.get(`/paiements-frais-annexes/${paiementId}/recu`, { responseType: 'blob' })
            .then(r => {
                const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
                const a = document.createElement('a');
                a.href = url; a.download = `recu_frais_${paiementId}.pdf`; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Impossible de générer le reçu.'));
    };

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
    if (!data)      return null;

    const { eleve, recap, paiements, total_du, total_paye, solde } = data;
    const fraisNonSoldes = (recap ?? []).filter(r => r.statut !== 'soldé');

    return (
        <div className="container-fluid py-4">
            {/* En-tête élève */}
            <div className="d-flex align-items-center mb-4 gap-3">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left" />
                </button>
                <div>
                    <h4 className="mb-0">{eleve.prenoms_eleve} {eleve.nom_eleve.toUpperCase()}</h4>
                    <small className="text-muted">{eleve.matricule_eleve} — {eleve.classe?.nom_classe}</small>
                </div>
                <div className="ms-auto d-flex gap-2 align-items-center">
                    {annees.length > 0 && (
                        <select className="form-select form-select-sm w-auto"
                            value={annee} onChange={e => { setAnnee(e.target.value); charger(e.target.value); }}>
                            {annees.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => ouvrirPaiement()}>
                        <i className="bi bi-plus-lg me-1" />Enregistrer un paiement
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 bg-light text-center py-3">
                        <div className="fs-5 fw-bold">{Number(total_du).toLocaleString('fr-FR')} FCFA</div>
                        <small className="text-muted">Total dû (obligatoires)</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 bg-success bg-opacity-10 text-center py-3">
                        <div className="fs-5 fw-bold text-success">{Number(total_paye).toLocaleString('fr-FR')} FCFA</div>
                        <small className="text-muted">Total payé</small>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className={`card border-0 text-center py-3 ${solde > 0 ? 'bg-danger bg-opacity-10' : 'bg-success bg-opacity-10'}`}>
                        <div className={`fs-5 fw-bold ${solde > 0 ? 'text-danger' : 'text-success'}`}>
                            {Number(solde).toLocaleString('fr-FR')} FCFA
                        </div>
                        <small className="text-muted">{solde > 0 ? 'Solde restant' : 'Tout réglé'}</small>
                    </div>
                </div>
            </div>

            {/* Récap par frais */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-transparent fw-semibold">
                    Récapitulatif des frais
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Désignation</th>
                                <th className="text-center">Obligatoire</th>
                                <th className="text-end">Montant dû</th>
                                <th className="text-end">Payé</th>
                                <th className="text-end">Solde</th>
                                <th className="text-center">Statut</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {(recap ?? []).map(r => (
                                <tr key={r.frais_id}>
                                    <td>{r.nom}</td>
                                    <td className="text-center">
                                        {r.obligatoire
                                            ? <span className="badge bg-danger">Oui</span>
                                            : <span className="badge bg-secondary">Non</span>}
                                    </td>
                                    <td className="text-end">{Number(r.montant_du).toLocaleString('fr-FR')}</td>
                                    <td className="text-end text-success">{Number(r.montant_paye).toLocaleString('fr-FR')}</td>
                                    <td className="text-end fw-semibold">{Number(r.solde).toLocaleString('fr-FR')}</td>
                                    <td className="text-center">
                                        <span className={`badge ${STATUT[r.statut]?.cls ?? 'bg-secondary'}`}>
                                            {STATUT[r.statut]?.label ?? r.statut}
                                        </span>
                                    </td>
                                    <td>
                                        {r.statut !== 'soldé' && (
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-sm btn-outline-primary"
                                                    onClick={() => ouvrirPaiement(r.frais_id)}>
                                                    <i className="bi bi-plus" /> Payer
                                                </button>
                                                <button className="btn btn-sm btn-outline-success"
                                                    disabled={paiementEnLigneId === r.frais_id}
                                                    onClick={() => payerEnLigne(r.frais_id)}>
                                                    {paiementEnLigneId === r.frais_id
                                                        ? <span className="spinner-border spinner-border-sm" />
                                                        : <>💳 En ligne</>}
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

            {/* Historique des paiements */}
            {paiements?.length > 0 && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent fw-semibold">
                        Historique des paiements
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Frais</th>
                                    <th className="text-end">Montant</th>
                                    <th>Mode</th>
                                    <th>Référence</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {paiements.map(p => (
                                    <tr key={p.id}>
                                        <td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                                        <td>{p.frais_annexe?.nom}</td>
                                        <td className="text-end fw-semibold">
                                            {Number(p.montant_paye).toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border">
                                                {MODES[p.mode_paiement] ?? p.mode_paiement}
                                            </span>
                                        </td>
                                        <td className="small text-muted">{p.reference_paiement || '—'}</td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end">
                                                <button className="btn btn-sm btn-outline-secondary"
                                                    title="Télécharger le reçu"
                                                    onClick={() => telechargerRecu(p.id)}>
                                                    <i className="bi bi-file-earmark-pdf" />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger"
                                                    title="Supprimer"
                                                    onClick={() => supprimerPaiement(p)}>
                                                    <i className="bi bi-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal paiement */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Enregistrer un paiement</h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={enregistrer}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Type de frais <span className="text-danger">*</span></label>
                                        <select className={`form-select ${erreurs.frais_annexe_id ? 'is-invalid' : ''}`}
                                            value={form.frais_annexe_id}
                                            onChange={e => setForm(f => ({ ...f, frais_annexe_id: e.target.value }))}>
                                            <option value="">-- Sélectionner --</option>
                                            {fraisNonSoldes.map(r => (
                                                <option key={r.frais_id} value={r.frais_id}>
                                                    {r.nom} — solde : {Number(r.solde).toLocaleString('fr-FR')} FCFA
                                                </option>
                                            ))}
                                            {(recap ?? []).filter(r => r.statut === 'soldé').map(r => (
                                                <option key={r.frais_id} value={r.frais_id} disabled>
                                                    {r.nom} (soldé)
                                                </option>
                                            ))}
                                        </select>
                                        {erreurs.frais_annexe_id && <div className="invalid-feedback">{erreurs.frais_annexe_id}</div>}
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Montant (FCFA) <span className="text-danger">*</span></label>
                                            <input type="number" min="1"
                                                className={`form-control ${erreurs.montant_paye ? 'is-invalid' : ''}`}
                                                value={form.montant_paye}
                                                onChange={e => setForm(f => ({ ...f, montant_paye: e.target.value }))} />
                                            {erreurs.montant_paye && <div className="invalid-feedback">{erreurs.montant_paye}</div>}
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Date <span className="text-danger">*</span></label>
                                            <input type="date"
                                                className={`form-control ${erreurs.date_paiement ? 'is-invalid' : ''}`}
                                                value={form.date_paiement}
                                                onChange={e => setForm(f => ({ ...f, date_paiement: e.target.value }))} />
                                            {erreurs.date_paiement && <div className="invalid-feedback">{erreurs.date_paiement}</div>}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Mode de paiement <span className="text-danger">*</span></label>
                                        <select className="form-select"
                                            value={form.mode_paiement}
                                            onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                                            {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Référence / N° chèque</label>
                                        <input className="form-control" value={form.reference_paiement}
                                            onChange={e => setForm(f => ({ ...f, reference_paiement: e.target.value }))} />
                                    </div>

                                    <div className="mb-1">
                                        <label className="form-label">Remarque</label>
                                        <input className="form-control" value={form.remarque}
                                            onChange={e => setForm(f => ({ ...f, remarque: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary"
                                        onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde
                                            ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                            : 'Enregistrer le paiement'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
