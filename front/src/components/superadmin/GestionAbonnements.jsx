import { useEffect, useState, useCallback } from 'react';
import { centralApi } from '../../api/axios';

const PLANS_COLORS = {
    demo:    { bg: 'bg-secondary', text: 'Démo' },
    basic:   { bg: 'bg-info',      text: 'Starter' },
    pro:     { bg: 'bg-primary',   text: 'Pro' },
    premium: { bg: 'bg-warning',   text: 'Premium' },
};

const STATUT_CONFIG = {
    actif:           { cls: 'success', icon: 'bi-check-circle-fill', label: 'Actif' },
    expire_bientot:  { cls: 'warning', icon: 'bi-exclamation-triangle-fill', label: 'Expire bientôt' },
    expire:          { cls: 'danger',  icon: 'bi-x-circle-fill', label: 'Expiré' },
    desactive:       { cls: 'secondary', icon: 'bi-slash-circle', label: 'Désactivé' },
};

const PERIODES = ['mensuel', 'annuel', 'offert', 'personnalise'];
const MODES_PAI = ['especes', 'cheque', 'virement', 'mobile_money', 'offert'];

const FORM_VIDE = {
    tenant_id: '', plan: 'basic', periode: 'annuel',
    date_debut: new Date().toISOString().slice(0, 10),
    duree_mois: '', montant_ht: '', taux_tva: 18,
    mode_paiement: 'virement', reference_paiement: '',
    avec_facture: true, notes: '',
};

export default function GestionAbonnements() {
    const [data, setData]               = useState(null);
    const [plans, setPlans]             = useState({});
    const [chargement, setChargement]   = useState(true);
    const [modal, setModal]             = useState(false);
    const [form, setForm]               = useState(FORM_VIDE);
    const [sauvegarde, setSauvegarde]   = useState(false);
    const [erreurs, setErreurs]         = useState({});
    const [historique, setHistorique]   = useState(null);
    const [tenantHistorique, setTenantHistorique] = useState(null);
    const [erreur, setErreur]           = useState('');
    const [filtre, setFiltre]           = useState('tous');
    const [recherche, setRecherche]     = useState('');

    const charger = useCallback(async () => {
        setChargement(true);
        setErreur('');
        try {
            const [rBilling, rPlans] = await Promise.all([
                centralApi.get('/superadmin/billing'),
                centralApi.get('/superadmin/billing/plans'),
            ]);
            setData(rBilling.data);
            setPlans(rPlans.data);
        } catch (e) {
            setErreur('Impossible de charger les données de billing.');
        } finally { setChargement(false); }
    }, []);

    useEffect(() => { charger(); }, [charger]);

    const ouvrirModalRenouvellement = (tenant) => {
        const planCourant = plans[tenant.plan] ?? {};
        setForm({
            ...FORM_VIDE,
            tenant_id: tenant.id,
            plan: tenant.plan,
            montant_ht: planCourant.prix_annuel ?? '',
        });
        setErreurs({});
        setModal(true);
    };

    const changerPlan = (plan) => {
        const planConfig = plans[plan] ?? {};
        const montant = form.periode === 'annuel'
            ? (planConfig.prix_annuel ?? 0)
            : (planConfig.prix_mensuel ?? 0);
        setForm(f => ({ ...f, plan, montant_ht: montant }));
    };

    const changerPeriode = (periode) => {
        const planConfig = plans[form.plan] ?? {};
        const montant = periode === 'annuel'
            ? (planConfig.prix_annuel ?? 0)
            : periode === 'mensuel'
                ? (planConfig.prix_mensuel ?? 0)
                : 0;
        setForm(f => ({ ...f, periode, montant_ht: montant }));
    };

    const montantTtc = () => {
        const ht  = parseFloat(form.montant_ht) || 0;
        const tva = parseFloat(form.taux_tva) || 0;
        return (ht * (1 + tva / 100)).toFixed(0);
    };

    const sauvegarder = async (e) => {
        e.preventDefault();
        setErreurs({});
        if (!form.tenant_id) { setErreurs({ tenant_id: 'Établissement requis' }); return; }
        setSauvegarde(true);
        try {
            await centralApi.post('/superadmin/billing/abonnements', form);
            setModal(false);
            charger();
        } catch (err) {
            if (err.response?.data?.errors) setErreurs(err.response.data.errors);
            else setErreurs({ _: 'Erreur lors de l\'enregistrement.' });
        } finally { setSauvegarde(false); }
    };

    const voirHistorique = async (tenant) => {
        setTenantHistorique(tenant);
        try {
            const r = await centralApi.get(`/superadmin/billing/tenants/${tenant.id}/historique`);
            setHistorique(r.data.abonnements);
        } catch { setHistorique([]); }
    };

    const telechargerFacture = (factureId) => {
        centralApi.get(`/superadmin/billing/factures/${factureId}/telecharger`, { responseType: 'blob' })
            .then(r => {
                const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
                const a = document.createElement('a'); a.href = url; a.download = `facture_${factureId}.pdf`; a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => alert('Impossible de télécharger la facture.'));
    };

    const marquerPayee = async (factureId) => {
        try {
            await centralApi.post(`/superadmin/billing/factures/${factureId}/payer`);
            voirHistorique(tenantHistorique);
        } catch { alert('Erreur.'); }
    };

    const tenantsFiltres = (data?.tenants ?? [])
        .filter(t => filtre === 'tous' || t.statut === filtre)
        .filter(t => !recherche || t.nom.toLowerCase().includes(recherche.toLowerCase()) || t.code?.toLowerCase().includes(recherche.toLowerCase()));

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    if (erreur) return <div className="alert alert-danger m-4">{erreur}</div>;

    const stats = data?.stats ?? {};

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Gestion des abonnements SaaS</h4>
                    <small className="text-muted">Suivi des plans et renouvellements des établissements</small>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(FORM_VIDE); setErreurs({}); setModal(true); }}>
                    <i className="bi bi-plus-lg me-1" />Nouvel abonnement
                </button>
            </div>

            {/* KPIs */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Établissements actifs', val: stats.actifs, cls: 'success' },
                    { label: 'Expire dans 30 jours', val: stats.expire_bientot, cls: 'warning' },
                    { label: 'Expirés', val: stats.expires, cls: 'danger' },
                    { label: 'Total établissements', val: stats.total, cls: 'primary' },
                ].map(k => (
                    <div key={k.label} className="col-md-3">
                        <div className={`card border-0 bg-${k.cls} bg-opacity-10 text-center py-3`}>
                            <div className={`fs-3 fw-bold text-${k.cls}`}>{k.val ?? 0}</div>
                            <small className="text-muted">{k.label}</small>
                        </div>
                    </div>
                ))}
            </div>

            {/* Répartition par plan */}
            {stats.par_plan && (
                <div className="d-flex gap-2 mb-3 flex-wrap">
                    {Object.entries(stats.par_plan).map(([plan, count]) => {
                        const pc = PLANS_COLORS[plan] ?? { bg: 'bg-secondary', text: plan };
                        return (
                            <span key={plan} className={`badge ${pc.bg} fs-6 px-3 py-2`}>
                                {pc.text} : {count}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="row g-2 align-items-center">
                        <div className="col-auto">
                            <div className="btn-group btn-group-sm">
                                {['tous', 'actif', 'expire_bientot', 'expire', 'desactive'].map(f => (
                                    <button key={f} className={`btn ${filtre === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setFiltre(f)}>
                                        {f === 'tous' ? 'Tous' : (STATUT_CONFIG[f]?.label ?? f)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="col">
                            <input className="form-control form-control-sm" placeholder="Rechercher un établissement…"
                                value={recherche} onChange={e => setRecherche(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau */}
            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Établissement</th>
                                <th>Code</th>
                                <th>Plan</th>
                                <th>Expiration</th>
                                <th className="text-center">Jours restants</th>
                                <th className="text-center">Statut</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {tenantsFiltres.length === 0 ? (
                                <tr><td colSpan={7} className="text-center text-muted py-4">Aucun établissement trouvé.</td></tr>
                            ) : tenantsFiltres.map(t => {
                                const sc = STATUT_CONFIG[t.statut] ?? STATUT_CONFIG.actif;
                                const pc = PLANS_COLORS[t.plan] ?? PLANS_COLORS.demo;
                                return (
                                    <tr key={t.id}>
                                        <td>
                                            <strong>{t.nom}</strong>
                                            {t.domaine && <div className="text-muted small">{t.domaine}</div>}
                                        </td>
                                        <td><code>{t.code}</code></td>
                                        <td><span className={`badge ${pc.bg}`}>{pc.text}</span></td>
                                        <td>
                                            {t.date_expiration
                                                ? new Date(t.date_expiration).toLocaleDateString('fr-FR')
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td className="text-center">
                                            {t.jours_restants !== null ? (
                                                <span className={`badge bg-${t.jours_restants <= 0 ? 'danger' : t.jours_restants <= 30 ? 'warning' : 'success'}`}>
                                                    {t.jours_restants <= 0 ? 'Expiré' : `${t.jours_restants} j`}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="text-center">
                                            <span className={`text-${sc.cls}`}>
                                                <i className={`bi ${sc.icon} me-1`} />{sc.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end">
                                                <button className="btn btn-sm btn-outline-primary"
                                                    onClick={() => ouvrirModalRenouvellement(t)} title="Renouveler">
                                                    <i className="bi bi-arrow-clockwise" />
                                                </button>
                                                <button className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => voirHistorique(t)} title="Historique">
                                                    <i className="bi bi-clock-history" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal création/renouvellement ── */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Créer / Renouveler un abonnement</h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={sauvegarder}>
                                <div className="modal-body">
                                    {erreurs._ && <div className="alert alert-danger">{erreurs._}</div>}

                                    <div className="mb-3">
                                        <label className="form-label">Établissement <span className="text-danger">*</span></label>
                                        <select className={`form-select ${erreurs.tenant_id ? 'is-invalid' : ''}`}
                                            value={form.tenant_id}
                                            onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}>
                                            <option value="">— Sélectionner —</option>
                                            {(data?.tenants ?? []).map(t => (
                                                <option key={t.id} value={t.id}>{t.nom} ({t.code})</option>
                                            ))}
                                        </select>
                                        {erreurs.tenant_id && <div className="invalid-feedback">{erreurs.tenant_id}</div>}
                                    </div>

                                    {/* Plan */}
                                    <div className="mb-3">
                                        <label className="form-label">Plan <span className="text-danger">*</span></label>
                                        <div className="row g-2">
                                            {Object.entries(plans).map(([key, p]) => (
                                                <div key={key} className="col-6 col-md-3">
                                                    <div className={`border rounded p-2 text-center h-100 ${form.plan === key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => changerPlan(key)}>
                                                        <input type="radio" className="d-none" checked={form.plan === key} onChange={() => {}} />
                                                        <div className={`badge ${PLANS_COLORS[key]?.bg ?? 'bg-secondary'} mb-1`}>{p.label ?? key}</div>
                                                        <div className="small text-muted">{p.description}</div>
                                                        <div className="small fw-bold mt-1">
                                                            {p.prix_annuel > 0
                                                                ? `${Number(p.prix_annuel).toLocaleString('fr-FR')} FCFA/an`
                                                                : 'Gratuit'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label">Période</label>
                                            <select className="form-select" value={form.periode}
                                                onChange={e => changerPeriode(e.target.value)}>
                                                {PERIODES.map(p => (
                                                    <option key={p} value={p}>
                                                        {p === 'mensuel' ? 'Mensuel' : p === 'annuel' ? 'Annuel' : p === 'offert' ? 'Offert (30 j)' : 'Personnalisé'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Date de début</label>
                                            <input type="date" className="form-control" value={form.date_debut}
                                                onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
                                        </div>
                                        {form.periode === 'personnalise' && (
                                            <div className="col-md-4">
                                                <label className="form-label">Durée (mois)</label>
                                                <input type="number" min="1" className="form-control" value={form.duree_mois}
                                                    onChange={e => setForm(f => ({ ...f, duree_mois: e.target.value }))} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Montants */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label">Montant HT (FCFA)</label>
                                            <input type="number" min="0" className="form-control" value={form.montant_ht}
                                                onChange={e => setForm(f => ({ ...f, montant_ht: e.target.value }))} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">TVA (%)</label>
                                            <input type="number" min="0" max="100" className="form-control" value={form.taux_tva}
                                                onChange={e => setForm(f => ({ ...f, taux_tva: e.target.value }))} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Total TTC</label>
                                            <input type="text" className="form-control bg-light fw-bold"
                                                readOnly value={`${Number(montantTtc()).toLocaleString('fr-FR')} FCFA`} />
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Mode de paiement</label>
                                            <select className="form-select" value={form.mode_paiement}
                                                onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                                                <option value="especes">Espèces</option>
                                                <option value="cheque">Chèque</option>
                                                <option value="virement">Virement bancaire</option>
                                                <option value="mobile_money">Mobile Money</option>
                                                <option value="offert">Offert</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Référence paiement</label>
                                            <input className="form-control" value={form.reference_paiement}
                                                onChange={e => setForm(f => ({ ...f, reference_paiement: e.target.value }))} />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Notes internes</label>
                                        <textarea className="form-control" rows={2} value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>

                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="avecFacture"
                                            checked={form.avec_facture}
                                            onChange={e => setForm(f => ({ ...f, avec_facture: e.target.checked }))} />
                                        <label className="form-check-label" htmlFor="avecFacture">
                                            Générer une facture automatiquement
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde
                                            ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                            : 'Créer l\'abonnement'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Panel historique ── */}
            {tenantHistorique && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Historique — {tenantHistorique.nom}
                                </h5>
                                <button className="btn-close" onClick={() => { setTenantHistorique(null); setHistorique(null); }} />
                            </div>
                            <div className="modal-body">
                                {historique === null ? (
                                    <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
                                ) : historique.length === 0 ? (
                                    <div className="alert alert-info">Aucun abonnement enregistré pour cet établissement.</div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Plan</th>
                                                    <th>Période</th>
                                                    <th>Du</th>
                                                    <th>Au</th>
                                                    <th className="text-end">Montant TTC</th>
                                                    <th>Mode</th>
                                                    <th>Statut</th>
                                                    <th>Facture</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historique.map(a => (
                                                    <tr key={a.id}>
                                                        <td><span className={`badge ${PLANS_COLORS[a.plan]?.bg ?? 'bg-secondary'}`}>{a.plan}</span></td>
                                                        <td className="small">{a.periode}</td>
                                                        <td className="small">{new Date(a.date_debut).toLocaleDateString('fr-FR')}</td>
                                                        <td className="small">{new Date(a.date_fin).toLocaleDateString('fr-FR')}</td>
                                                        <td className="text-end">{Number(a.montant_ttc).toLocaleString('fr-FR')} FCFA</td>
                                                        <td className="small">{a.mode_paiement}</td>
                                                        <td>
                                                            <span className={`badge bg-${a.statut === 'actif' ? 'success' : a.statut === 'expire' ? 'danger' : 'secondary'}`}>
                                                                {a.statut}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {a.facture ? (
                                                                <div className="d-flex gap-1">
                                                                    <button className="btn btn-xs btn-outline-secondary px-2 py-1"
                                                                        style={{ fontSize: '11px' }}
                                                                        onClick={() => telechargerFacture(a.facture.id)}
                                                                        title="Télécharger PDF">
                                                                        <i className="bi bi-file-earmark-pdf" />
                                                                    </button>
                                                                    {a.facture.statut !== 'payee' && (
                                                                        <button className="btn btn-xs btn-outline-success px-2 py-1"
                                                                            style={{ fontSize: '11px' }}
                                                                            onClick={() => marquerPayee(a.facture.id)}
                                                                            title="Marquer payée">
                                                                            <i className="bi bi-check" />
                                                                        </button>
                                                                    )}
                                                                    <span className={`badge ${a.facture.statut === 'payee' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                                        {a.facture.statut === 'payee' ? 'Payée' : 'À régler'}
                                                                    </span>
                                                                </div>
                                                            ) : <span className="text-muted small">—</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary"
                                    onClick={() => { setTenantHistorique(null); setHistorique(null); }}>
                                    Fermer
                                </button>
                                <button className="btn btn-primary"
                                    onClick={() => { setTenantHistorique(null); setHistorique(null); ouvrirModalRenouvellement(tenantHistorique); }}>
                                    <i className="bi bi-arrow-clockwise me-1" />Renouveler
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
