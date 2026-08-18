import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const BADGE    = { soldé: 'bg-success', partiel: 'bg-warning text-dark', impayé: 'bg-danger' };
const MODES    = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', autre: 'Autre', cinetpay: 'CinetPay' };
const RETURN_URL = window.location.origin + '/PaiementRetour';

const telechargerFichier = async (apiUrl, nomFichier, type = 'application/octet-stream') => {
    const r = await api.get(apiUrl, { responseType: 'blob' });
    const url  = URL.createObjectURL(new Blob([r.data], { type }));
    const lien = document.createElement('a');
    lien.href = url; lien.download = nomFichier; lien.click();
    URL.revokeObjectURL(url);
};

const PaiementsEleve = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const { id } = useParams();
    const [data, setData]               = useState(null);
    const [chargement, setChargement]   = useState(true);
    const [loadErreur, setLoadErreur]   = useState('');
    const [paiementId, setPaiementId]   = useState(null); // scolarite_id en cours

    const recuPdf = async (paiementId) => {
        try {
            await telechargerFichier(`/paiements/${paiementId}/recu`, `recu_${String(paiementId).padStart(6, '0')}.pdf`, 'application/pdf');
        } catch {
            toast.error('Impossible de télécharger le reçu.');
        }
    };

    const charger = () => {
        setChargement(true);
        api.get(`/paiementsEleve/${id}`)
            .then((r) => { setData(r.data); setChargement(false); })
            .catch(() => { setLoadErreur('Impossible de charger les paiements.'); setChargement(false); });
    };

    useEffect(() => { charger(); }, [id]);

    const supprimer = async (paiementId) => {
        if (!await confirmer('Supprimer ce paiement ?')) return;
        api.delete(`/paiements/${paiementId}`).then(charger).catch(() => toast.error('Erreur lors de la suppression.'));
    };

    const payerEnLigne = (ec) => {
        setPaiementId(ec.scolarite_id);
        api.post('/paiements/initier', {
            eleve_id:     id,
            scolarite_id: ec.scolarite_id,
            montant:      ec.solde,
            return_url:   RETURN_URL,
        })
        .then((r) => { window.open(r.data.payment_url, '_blank'); })
        .catch(() => toast.error('Impossible d\'initier le paiement. Vérifiez la configuration CinetPay.'))
        .finally(() => setPaiementId(null));
    };

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
    if (loadErreur) return <div className="alert alert-danger m-4">{loadErreur}</div>;
    if (!data)      return null;

    const { eleve, recap_echeances, paiements, total_du, total_paye, solde_restant } = data;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        Paiements — {eleve.nom_eleve} {eleve.prenoms_eleve}
                        <small className="text-muted ms-2 fs-6">{eleve.matricule_eleve}</small>
                    </h4>
                    <div className="d-flex gap-2">
                        <NavLink to={`/NouveauPaiement?eleve_id=${id}`} className="btn btn-primary btn-sm">+ Paiement</NavLink>
                        <NavLink to="/RecapPaiements" className="btn btn-secondary btn-sm">Retour récap</NavLink>
                    </div>
                </div>

                {/* Résumé */}
                <div className="row mb-4">
                    <div className="col-md-4">
                        <div className="card border-primary text-center">
                            <div className="card-body py-2">
                                <div className="text-muted small">Total dû</div>
                                <h5 className="mb-0">{total_du.toLocaleString('fr-FR')} FCFA</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-success text-center">
                            <div className="card-body py-2">
                                <div className="text-muted small">Total payé</div>
                                <h5 className="mb-0 text-success">{total_paye.toLocaleString('fr-FR')} FCFA</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className={`card border-${solde_restant > 0 ? 'danger' : 'success'} text-center`}>
                            <div className="card-body py-2">
                                <div className="text-muted small">Solde restant</div>
                                <h5 className={`mb-0 text-${solde_restant > 0 ? 'danger' : 'success'}`}>
                                    {solde_restant.toLocaleString('fr-FR')} FCFA
                                </h5>
                            </div>
                        </div>
                    </div>
                </div>

                {/* État des échéances */}
                <h6 className="fw-bold mb-2">État des échéances</h6>
                <table className="table table-sm table-bordered mb-4">
                    <thead className="table-light">
                        <tr>
                            <th>Échéance</th>
                            <th>Date limite</th>
                            <th>Montant dû</th>
                            <th>Montant payé</th>
                            <th>Solde</th>
                            <th>Statut</th>
                            <th>Paiement en ligne</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recap_echeances.map((ec) => (
                            <tr key={ec.scolarite_id}>
                                <td>{ec.libelle}</td>
                                <td>{new Date(ec.date_echeance).toLocaleDateString('fr-FR')}</td>
                                <td>{ec.montant_du.toLocaleString('fr-FR')}</td>
                                <td>{ec.montant_paye.toLocaleString('fr-FR')}</td>
                                <td className={ec.solde > 0 ? 'text-danger' : 'text-success'}>
                                    {ec.solde.toLocaleString('fr-FR')}
                                </td>
                                <td><span className={`badge ${BADGE[ec.statut]}`}>{ec.statut}</span></td>
                                <td>
                                    {ec.statut !== 'soldé' && (
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            disabled={paiementId === ec.scolarite_id}
                                            onClick={() => payerEnLigne(ec)}
                                        >
                                            {paiementId === ec.scolarite_id
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : '💳 Payer en ligne'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Historique des paiements */}
                <h6 className="fw-bold mb-2">Historique des paiements</h6>
                {paiements.length === 0 ? (
                    <p className="text-muted">Aucun paiement enregistré pour cet élève.</p>
                ) : (
                    <table className="table table-sm table-striped">
                        <thead className="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Échéance</th>
                                <th>Montant</th>
                                <th>Mode</th>
                                <th>Référence</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paiements.map((p) => (
                                <tr key={p.id}>
                                    <td>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                                    <td>{p.scolarite?.libelle_echeance}</td>
                                    <td className="fw-bold">{Number(p.montant_paye).toLocaleString('fr-FR')}</td>
                                    <td>{MODES[p.mode_paiement]}</td>
                                    <td className="text-muted small">{p.reference_paiement}</td>
                                    <td>
                                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => recuPdf(p.id)} title="Télécharger le reçu PDF">
                                            <i className="fas fa-file-pdf" />
                                        </button>
                                        <NavLink to={`/DetailsPaiement/${p.id}`} className="btn btn-warning btn-sm me-1">Modifier</NavLink>
                                        <button className="btn btn-danger btn-sm" onClick={() => supprimer(p.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default PaiementsEleve;
