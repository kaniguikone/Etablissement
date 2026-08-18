import React, { useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const fmtMontant = (n) => n != null ? Number(n).toLocaleString('fr-FR') + ' F' : '—';

const NouveauPaiement = () => {
    const { toast } = useToast();

    const [matriculeInput,   setMatriculeInput]   = useState('');
    const [rechercheEnCours, setRechercheEnCours] = useState(false);
    const [eleveInfo,        setEleveInfo]        = useState(null);
    const [statusPaiement,   setStatusPaiement]   = useState(null);
    const [echeances,        setEcheances]        = useState([]);
    const [chargement,       setChargement]       = useState(false);

    const [form, setForm] = useState({
        eleve_id: '', scolarite_id: '', montant_paye: '',
        date_paiement: new Date().toISOString().split('T')[0],
        mode_paiement: 'especes', reference_paiement: '', remarque: '',
    });

    const rechercherEleve = async (e) => {
        e?.preventDefault();
        const m = matriculeInput.trim();
        if (!m) return;
        setRechercheEnCours(true);
        setEleveInfo(null);
        setStatusPaiement(null);
        setEcheances([]);
        setForm(prev => ({ ...prev, eleve_id: '', scolarite_id: '', montant_paye: '' }));
        try {
            const r = await api.get(`/eleves?s=${encodeURIComponent(m)}`);
            const liste = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            const found = liste.find(el => el.matricule_eleve?.toLowerCase() === m.toLowerCase()) ?? liste[0];
            if (!found) {
                toast.error(`Aucun élève trouvé avec le matricule « ${m} ».`);
                return;
            }

            const [detailRes, statusRes] = await Promise.all([
                api.get(`/eleves/${found.id}`),
                api.get(`/paiementsEleve/${found.id}`),
            ]);

            const eleve = detailRes.data;
            const status = statusRes.data;

            setEleveInfo(eleve);
            setStatusPaiement(status);
            setForm(prev => ({ ...prev, eleve_id: String(found.id) }));

            const niveauId = eleve.classe?.niveau_id;
            if (niveauId) {
                const echRes = await api.get(`/scolaritesNiveau/${niveauId}`);
                setEcheances(echRes.data);
            }
        } catch {
            toast.error('Erreur lors de la recherche.');
        } finally {
            setRechercheEnCours(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEcheanceChange = (e) => {
        const scolariteId = e.target.value;
        const echeance = echeances.find(ec => String(ec.id) === String(scolariteId));
        setForm(prev => ({
            ...prev,
            scolarite_id: scolariteId,
            montant_paye: echeance ? echeance.montant_echeance : prev.montant_paye,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setChargement(true);
        try {
            await api.post('/paiements', form);
            toast.success('Paiement enregistré.');
            // Rafraîchir le statut de l'élève sans quitter la page
            const statusRes = await api.get(`/paiementsEleve/${form.eleve_id}`);
            setStatusPaiement(statusRes.data);
            setForm(prev => ({ ...prev, scolarite_id: '', montant_paye: '' }));
        } catch (err) {
            const errors = err.response?.data?.errors;
            toast.error(errors ? Object.values(errors).flat().join(' ') : 'Erreur lors de l\'enregistrement.');
        } finally {
            setChargement(false);
        }
    };

    const statutVariant = (s) => {
        if (s === 'soldé') return 'success';
        if (s === 'partiel') return 'warning';
        return 'danger';
    };

    const telechargerRecu = async (paiementId) => {
        try {
            const r = await api.get(`/paiements/${paiementId}/recu`, { responseType: 'blob', timeout: 30000 });
            const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href = url;
            lien.download = `recu_paiement_${paiementId}.pdf`;
            lien.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Impossible de télécharger le reçu.');
        }
    };

    const reinitialiser = () => {
        setMatriculeInput('');
        setEleveInfo(null);
        setStatusPaiement(null);
        setEcheances([]);
        setForm({
            eleve_id: '', scolarite_id: '', montant_paye: '',
            date_paiement: new Date().toISOString().split('T')[0],
            mode_paiement: 'especes', reference_paiement: '', remarque: '',
        });
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Enregistrer un paiement</h4>
                    <button className="btn btn-secondary btn-sm" onClick={reinitialiser}>
                        <i className="fas fa-undo me-1" />Nouvelle saisie
                    </button>
                </div>

                {/* Recherche par matricule */}
                <form className="row g-2 align-items-end mb-4" onSubmit={rechercherEleve}>
                    <div className="col-md-4">
                        <label className="form-label fw-semibold">
                            <i className="fas fa-search me-1 text-primary" />
                            Matricule de l'élève
                        </label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Ex. : 2024-0001"
                            value={matriculeInput}
                            onChange={e => setMatriculeInput(e.target.value)}
                        />
                    </div>
                    <div className="col-auto">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={rechercheEnCours || !matriculeInput.trim()}>
                            {rechercheEnCours
                                ? <span className="spinner-border spinner-border-sm" />
                                : <><i className="fas fa-search me-1" />Rechercher</>}
                        </button>
                    </div>
                </form>

                {/* Fiche élève + état financier */}
                {eleveInfo && statusPaiement && (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2">
                            <span className="fw-semibold">
                                <i className="fas fa-user-graduate me-2" />
                                {eleveInfo.nom_eleve} {eleveInfo.prenoms_eleve}
                            </span>
                            <div className="d-flex gap-2 align-items-center">
                                <span className="badge bg-secondary">{eleveInfo.matricule_eleve}</span>
                                <span className="text-muted small">{eleveInfo.classe?.nom_classe ?? '—'}</span>
                            </div>
                        </div>
                        <div className="card-body py-2">
                            <div className="row g-2 mb-2">
                                <div className="col-4">
                                    <div className="border rounded text-center py-2">
                                        <div className="small text-muted">Total dû</div>
                                        <div className="fw-bold">{fmtMontant(statusPaiement.total_du)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="border rounded text-center py-2 border-success">
                                        <div className="small text-muted">Payé</div>
                                        <div className="fw-bold text-success">{fmtMontant(statusPaiement.total_paye)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className={`border rounded text-center py-2 border-${statusPaiement.solde_restant > 0 ? 'danger' : 'success'}`}>
                                        <div className="small text-muted">Solde restant</div>
                                        <div className={`fw-bold text-${statusPaiement.solde_restant > 0 ? 'danger' : 'success'}`}>
                                            {fmtMontant(statusPaiement.solde_restant)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {statusPaiement.recap_echeances?.length > 0 && (
                                <table className="table table-sm table-borderless mb-0 mt-1">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Échéance</th>
                                            <th>Statut</th>
                                            <th className="text-end">Dû</th>
                                            <th className="text-end">Payé</th>
                                            <th className="text-end">Solde</th>
                                            <th>Reçus</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statusPaiement.recap_echeances.map((ec) => {
                                            const paiementsEc = (statusPaiement.paiements ?? []).filter(p => p.scolarite_id === ec.scolarite_id);
                                            return (
                                                <tr key={ec.scolarite_id}>
                                                    <td className="small">{ec.libelle}</td>
                                                    <td><span className={`badge bg-${statutVariant(ec.statut)}`} style={{ fontSize: 10 }}>{ec.statut}</span></td>
                                                    <td className="text-end small text-muted">{fmtMontant(ec.montant_du)}</td>
                                                    <td className="text-end small text-success">{fmtMontant(ec.montant_paye)}</td>
                                                    <td className="text-end small fw-bold">{fmtMontant(ec.solde)}</td>
                                                    <td>
                                                        {paiementsEc.map(p => (
                                                            <button
                                                                key={p.id}
                                                                className="btn btn-outline-danger btn-sm py-0 px-1 me-1"
                                                                onClick={() => telechargerRecu(p.id)}
                                                                title={`Reçu du ${new Date(p.date_paiement).toLocaleDateString('fr-FR')} — ${fmtMontant(p.montant_paye)}`}
                                                            >
                                                                <i className="fas fa-receipt" />
                                                            </button>
                                                        ))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Formulaire de paiement */}
                {form.eleve_id && (
                    <form onSubmit={handleSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label">Échéance *</label>
                            <select className="form-select form-select-sm" name="scolarite_id" value={form.scolarite_id} onChange={handleEcheanceChange} required>
                                <option value="">Sélectionner une échéance</option>
                                {echeances.map((ec) => (
                                    <option key={ec.id} value={ec.id}>
                                        {ec.libelle_echeance} — {Number(ec.montant_echeance).toLocaleString('fr-FR')} F (échéance : {new Date(ec.date_echeance).toLocaleDateString('fr-FR')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Montant payé *</label>
                            <input type="number" className="form-control form-control-sm" name="montant_paye" value={form.montant_paye} onChange={handleChange} min="1" required />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Date du paiement *</label>
                            <input type="date" className="form-control form-control-sm" name="date_paiement" value={form.date_paiement} onChange={handleChange} required />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Mode de paiement *</label>
                            <select className="form-select form-select-sm" name="mode_paiement" value={form.mode_paiement} onChange={handleChange} required>
                                <option value="especes">Espèces</option>
                                <option value="cheque">Chèque</option>
                                <option value="virement">Virement</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Référence / N° de reçu</label>
                            <input type="text" className="form-control form-control-sm" name="reference_paiement" value={form.reference_paiement} onChange={handleChange} placeholder="Optionnel" />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Remarque</label>
                            <input type="text" className="form-control form-control-sm" name="remarque" value={form.remarque} onChange={handleChange} placeholder="Optionnel" />
                        </div>

                        <div className="col-12 mb-3">
                            <button type="submit" className="btn btn-primary btn-sm" disabled={chargement}>
                                {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                                Enregistrer le paiement
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
};

export default NouveauPaiement;
