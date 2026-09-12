import React, { useEffect, useState } from 'react';
import api, { backendUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const MODES = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', mobile_money: 'Mobile Money', autre: 'Autre' };
const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const VIDE = { categorie_id: '', libelle: '', montant: '', date_depense: '', beneficiaire: '', mode_paiement: 'especes' };

export default function BudgetDepenses() {
    const { peutAcceder } = useAuth();
    const { toast }   = useToast();
    const { confirmer } = useConfirm();
    const peutGerer = peutAcceder(['budget_gestion']);

    const [annees, setAnnees]   = useState([]);
    const [anneeId, setAnneeId] = useState('');
    const [categories, setCategories] = useState([]);
    const [depenses, setDepenses]     = useState([]);
    const [solde, setSolde]           = useState(null);
    const [chargement, setChargement] = useState(true);

    const [modal, setModal] = useState(false);
    const [form, setForm]   = useState(VIDE);
    const [fichier, setFichier] = useState(null);
    const [erreurs, setErreurs] = useState({});
    const [sauvegarde, setSauvegarde] = useState(false);

    useEffect(() => {
        Promise.all([api.get('/annees-scolaires'), api.get('/budget/categories-depense')])
            .then(([ra, rc]) => {
                setAnnees(ra.data);
                setCategories(rc.data);
                const enCours = ra.data.find(a => a.statut === 'en_cours');
                setAnneeId(String((enCours ?? ra.data[0])?.id ?? ''));
            })
            .catch(() => toast.error('Erreur lors du chargement.'));
    }, []);

    const charger = () => {
        if (!anneeId) return;
        setChargement(true);
        Promise.all([
            api.get(`/budget/depenses?annee_scolaire_id=${anneeId}`),
            api.get(`/budget/solde?annee_scolaire_id=${anneeId}`),
        ]).then(([rd, rs]) => { setDepenses(rd.data); setSolde(rs.data); })
          .catch(() => toast.error('Erreur lors du chargement des dépenses.'))
          .finally(() => setChargement(false));
    };

    useEffect(() => { charger(); }, [anneeId]);

    const ouvrirCreation = () => {
        setForm({ ...VIDE, date_depense: new Date().toISOString().slice(0, 10) });
        setFichier(null);
        setErreurs({});
        setModal(true);
    };

    const valider = () => {
        const e = {};
        if (!form.categorie_id)  e.categorie_id = 'Catégorie requise';
        if (!form.libelle.trim()) e.libelle = 'Libellé requis';
        if (!form.montant || isNaN(form.montant) || Number(form.montant) < 1) e.montant = 'Montant invalide';
        if (!form.date_depense)  e.date_depense = 'Date requise';
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const enregistrer = async (e) => {
        e.preventDefault();
        if (!valider()) return;
        setSauvegarde(true);
        try {
            const data = new FormData();
            data.append('annee_scolaire_id', anneeId);
            Object.entries(form).forEach(([k, v]) => data.append(k, v ?? ''));
            if (fichier) data.append('justificatif', fichier);

            await api.post('/budget/depenses', data);
            toast.success('Dépense enregistrée.');
            setModal(false);
            charger();
        } catch (err) {
            if (err.response?.status === 422 && err.response.data?.solde_disponible !== undefined) {
                toast.error(err.response.data.message);
            } else if (err.response?.data?.errors) {
                setErreurs(err.response.data.errors);
            } else {
                toast.error("Erreur lors de l'enregistrement.");
            }
        } finally { setSauvegarde(false); }
    };

    const supprimer = async (d) => {
        const ok = await confirmer(`Supprimer la dépense « ${d.libelle} » ? Cette action est irréversible.`);
        if (!ok) return;
        try {
            await api.delete(`/budget/depenses/${d.id}`);
            toast.success('Dépense supprimée.');
            charger();
        } catch { toast.error('Erreur lors de la suppression.'); }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Dépenses</h4>
                    <small className="text-muted">Sorties d&apos;argent imputées sur l&apos;enveloppe budgétaire de l&apos;année</small>
                </div>
                {peutGerer && (
                    <button className="btn btn-primary" onClick={ouvrirCreation}>
                        <i className="fas fa-plus me-1" /> Nouvelle dépense
                    </button>
                )}
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body d-flex flex-wrap gap-4 align-items-center">
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Année scolaire</label>
                        <select className="form-select form-select-sm" value={anneeId} onChange={e => setAnneeId(e.target.value)}>
                            {annees.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                        </select>
                    </div>
                    {solde && (
                        <div className="d-flex gap-4 ms-auto">
                            <div className="text-center">
                                <div className="text-muted small">Octroyé</div>
                                <div className="fw-bold text-success">{fmt(solde.octroye)} F</div>
                            </div>
                            <div className="text-center">
                                <div className="text-muted small">Dépensé</div>
                                <div className="fw-bold text-danger">{fmt(solde.depense)} F</div>
                            </div>
                            <div className="text-center">
                                <div className="text-muted small">Solde disponible</div>
                                <div className={`fw-bold ${solde.solde > 0 ? 'text-primary' : 'text-danger'}`}>{fmt(solde.solde)} F</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : depenses.length === 0 ? (
                <div className="alert alert-info text-center">Aucune dépense enregistrée pour cette année.</div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Libellé</th>
                                    <th>Catégorie</th>
                                    <th>Bénéficiaire</th>
                                    <th>Mode</th>
                                    <th className="text-end">Montant</th>
                                    <th className="text-center">Justificatif</th>
                                    {peutGerer && <th />}
                                </tr>
                            </thead>
                            <tbody>
                                {depenses.map(d => (
                                    <tr key={d.id}>
                                        <td>{new Date(d.date_depense).toLocaleDateString('fr-FR')}</td>
                                        <td className="fw-semibold">{d.libelle}</td>
                                        <td><span className="badge bg-light text-dark border">{d.categorie?.nom ?? '—'}</span></td>
                                        <td className="text-muted">{d.beneficiaire ?? '—'}</td>
                                        <td>{MODES[d.mode_paiement] ?? d.mode_paiement}</td>
                                        <td className="text-end fw-semibold text-danger">{fmt(d.montant)} F</td>
                                        <td className="text-center">
                                            {d.justificatif_path
                                                ? <a href={backendUrl('/api/image/' + d.justificatif_path)} target="_blank" rel="noreferrer">
                                                      <i className="fas fa-file-alt" />
                                                  </a>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        {peutGerer && (
                                            <td>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(d)} title="Supprimer">
                                                    <i className="fas fa-trash" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Nouvelle dépense</h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={enregistrer}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Libellé <span className="text-danger">*</span></label>
                                        <input className={`form-control ${erreurs.libelle ? 'is-invalid' : ''}`}
                                            value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
                                        {erreurs.libelle && <div className="invalid-feedback">{erreurs.libelle}</div>}
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Catégorie <span className="text-danger">*</span></label>
                                            <select className={`form-select ${erreurs.categorie_id ? 'is-invalid' : ''}`}
                                                value={form.categorie_id} onChange={e => setForm(f => ({ ...f, categorie_id: e.target.value }))}>
                                                <option value="">—</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                            </select>
                                            {erreurs.categorie_id && <div className="invalid-feedback">{erreurs.categorie_id}</div>}
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Montant (FCFA) <span className="text-danger">*</span></label>
                                            <input type="number" min="1" className={`form-control ${erreurs.montant ? 'is-invalid' : ''}`}
                                                value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
                                            {erreurs.montant && <div className="invalid-feedback">{erreurs.montant}</div>}
                                        </div>
                                    </div>
                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Date <span className="text-danger">*</span></label>
                                            <input type="date" className={`form-control ${erreurs.date_depense ? 'is-invalid' : ''}`}
                                                value={form.date_depense} onChange={e => setForm(f => ({ ...f, date_depense: e.target.value }))} />
                                            {erreurs.date_depense && <div className="invalid-feedback">{erreurs.date_depense}</div>}
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Mode de paiement</label>
                                            <select className="form-select" value={form.mode_paiement}
                                                onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                                                {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Bénéficiaire (fournisseur/prestataire)</label>
                                        <input className="form-control" value={form.beneficiaire}
                                            onChange={e => setForm(f => ({ ...f, beneficiaire: e.target.value }))} />
                                    </div>
                                    <div className="mb-1">
                                        <label className="form-label">Justificatif (facture/reçu)</label>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control"
                                            onChange={e => setFichier(e.target.files?.[0] ?? null)} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</> : 'Enregistrer'}
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
