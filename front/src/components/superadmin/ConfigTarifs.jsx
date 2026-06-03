import { useEffect, useState } from 'react';
import { centralApi as axios } from '../../api/axios';

const fmt = (n) => Number(n).toLocaleString('fr-FR');

const TRANCHE_VIDE = { tranche_min: '', tranche_max: '', prix_par_eleve: '' };

const ConfigTarifs = () => {
    const [tranches, setTranches]   = useState([]);
    const [config, setConfig]       = useState({});
    const [chargement, setChargement] = useState(true);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [erreur, setErreur]       = useState('');
    const [succes, setSucces]       = useState('');

    // Tranche en cours d'édition : { id } ou 'nouveau'
    const [edition, setEdition]     = useState(null);
    const [formTranche, setFormTranche] = useState(TRANCHE_VIDE);

    // Simulateur
    const [effectifSim, setEffectifSim] = useState('');
    const [simulation, setSimulation]   = useState(null);

    const charger = () => {
        setChargement(true);
        axios.get(`/superadmin/tarifs`)
            .then(r => { setTranches(r.data.tranches); setConfig(r.data.config); })
            .catch(() => setErreur('Erreur de chargement.'))
            .finally(() => setChargement(false));
    };

    useEffect(() => { charger(); }, []);

    const msg = (texte, ok = true) => {
        if (ok) { setSucces(texte); setErreur(''); }
        else { setErreur(texte); setSucces(''); }
        setTimeout(() => { setSucces(''); setErreur(''); }, 3500);
    };

    // ── Config globale ──────────────────────────────────────────────────────
    const sauvegarderConfig = async () => {
        setSauvegarde(true);
        try {
            await axios.put(`/superadmin/tarifs/config`, {
                plancher_minimum:   parseInt(config.plancher_minimum) || 0,
                taux_tva:           parseFloat(config.taux_tva) || 0,
                duree_demo_jours:   parseInt(config.duree_demo_jours) || 30,
                tarif_acces_parent: parseInt(config.tarif_acces_parent) || 0,
            });
            msg('Configuration enregistrée.');
        } catch { msg('Erreur lors de l\'enregistrement.', false); }
        finally { setSauvegarde(false); }
    };

    // ── Tranches ─────────────────────────────────────────────────────────────
    const ouvrirEdition = (t) => {
        setEdition(t.id);
        setFormTranche({ tranche_min: t.tranche_min, tranche_max: t.tranche_max ?? '', prix_par_eleve: t.prix_par_eleve });
    };

    const ouvrirNouvelle = () => {
        setEdition('nouveau');
        setFormTranche(TRANCHE_VIDE);
    };

    const annuler = () => { setEdition(null); setFormTranche(TRANCHE_VIDE); };

    const sauvegarderTranche = async () => {
        const payload = {
            tranche_min:    parseInt(formTranche.tranche_min),
            tranche_max:    formTranche.tranche_max !== '' ? parseInt(formTranche.tranche_max) : null,
            prix_par_eleve: parseInt(formTranche.prix_par_eleve),
            ordre:          tranches.length + 1,
        };
        try {
            if (edition === 'nouveau') {
                await axios.post(`/superadmin/tarifs/tranches`, payload);
                msg('Tranche ajoutée.');
            } else {
                await axios.put(`/superadmin/tarifs/tranches/${edition}`, payload);
                msg('Tranche modifiée.');
            }
            annuler(); charger();
        } catch (err) {
            msg(err.response?.data?.message ?? 'Erreur.', false);
        }
    };

    const supprimerTranche = async (id) => {
        if (!confirm('Supprimer cette tranche ?')) return;
        try {
            await axios.delete(`/superadmin/tarifs/tranches/${id}`);
            msg('Tranche supprimée.'); charger();
        } catch { msg('Erreur lors de la suppression.', false); }
    };

    const simuler = async () => {
        if (!effectifSim) return;
        try {
            const { data } = await axios.post(`/superadmin/tarifs/simuler`, { effectif: parseInt(effectifSim) });
            setSimulation(data);
        } catch { msg('Erreur de simulation.', false); }
    };

    if (chargement) return (
        <section className="page-wrapper">
            <div className="container-fluid text-center py-5"><div className="spinner-border text-primary" /></div>
        </section>
    );

    return (
        <section className="page-wrapper">
            <div className="container-fluid">
                <h4 className="mb-4"><i className="fas fa-tags me-2 text-primary" />Configuration des tarifs</h4>

                {succes && <div className="alert alert-success py-2 small mb-3"><i className="fas fa-check-circle me-2" />{succes}</div>}
                {erreur && <div className="alert alert-danger py-2 small mb-3"><i className="fas fa-exclamation-circle me-2" />{erreur}</div>}

                <div className="row g-4">
                    {/* ── Tranches ── */}
                    <div className="col-lg-7">
                        <div className="card shadow-sm">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span className="fw-semibold"><i className="fas fa-layer-group me-2" />Tranches de prix</span>
                                <button className="btn btn-primary btn-sm" onClick={ouvrirNouvelle}>
                                    <i className="fas fa-plus me-1" />Ajouter une tranche
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>De</th>
                                            <th>À</th>
                                            <th className="text-end">Prix / élève / an</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tranches.map(t => (
                                            <tr key={t.id}>
                                                {edition === t.id ? (
                                                    <>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm" style={{ width: 90 }}
                                                                value={formTranche.tranche_min}
                                                                onChange={e => setFormTranche(f => ({ ...f, tranche_min: e.target.value }))} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm" style={{ width: 90 }}
                                                                placeholder="∞"
                                                                value={formTranche.tranche_max}
                                                                onChange={e => setFormTranche(f => ({ ...f, tranche_max: e.target.value }))} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm text-end" style={{ width: 110 }}
                                                                value={formTranche.prix_par_eleve}
                                                                onChange={e => setFormTranche(f => ({ ...f, prix_par_eleve: e.target.value }))} />
                                                        </td>
                                                        <td className="text-end">
                                                            <button className="btn btn-success btn-sm me-1" onClick={sauvegarderTranche}>
                                                                <i className="fas fa-check" />
                                                            </button>
                                                            <button className="btn btn-outline-secondary btn-sm" onClick={annuler}>
                                                                <i className="fas fa-times" />
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{fmt(t.tranche_min)} élèves</td>
                                                        <td>{t.tranche_max ? fmt(t.tranche_max) + ' élèves' : <span className="text-muted">Illimité</span>}</td>
                                                        <td className="text-end fw-semibold">{fmt(t.prix_par_eleve)} FCFA</td>
                                                        <td className="text-end">
                                                            <button className="btn btn-outline-primary btn-sm me-1" onClick={() => ouvrirEdition(t)} title="Modifier">
                                                                <i className="fas fa-pen" />
                                                            </button>
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => supprimerTranche(t.id)} title="Supprimer"
                                                                disabled={tranches.length <= 1}>
                                                                <i className="fas fa-trash" />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}

                                        {/* Ligne nouvelle tranche */}
                                        {edition === 'nouveau' && (
                                            <tr className="table-primary">
                                                <td>
                                                    <input type="number" className="form-control form-control-sm" style={{ width: 90 }}
                                                        placeholder="De" autoFocus
                                                        value={formTranche.tranche_min}
                                                        onChange={e => setFormTranche(f => ({ ...f, tranche_min: e.target.value }))} />
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm" style={{ width: 90 }}
                                                        placeholder="∞"
                                                        value={formTranche.tranche_max}
                                                        onChange={e => setFormTranche(f => ({ ...f, tranche_max: e.target.value }))} />
                                                </td>
                                                <td>
                                                    <input type="number" className="form-control form-control-sm text-end" style={{ width: 110 }}
                                                        placeholder="Prix FCFA"
                                                        value={formTranche.prix_par_eleve}
                                                        onChange={e => setFormTranche(f => ({ ...f, prix_par_eleve: e.target.value }))} />
                                                </td>
                                                <td className="text-end">
                                                    <button className="btn btn-success btn-sm me-1" onClick={sauvegarderTranche}>
                                                        <i className="fas fa-check" />
                                                    </button>
                                                    <button className="btn btn-outline-secondary btn-sm" onClick={annuler}>
                                                        <i className="fas fa-times" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer text-muted small">
                                <i className="fas fa-info-circle me-1" />
                                La borne supérieure "∞" signifie que la tranche couvre tous les élèves au-delà de la borne inférieure.
                            </div>
                        </div>
                    </div>

                    {/* ── Config + Simulateur ── */}
                    <div className="col-lg-5 d-flex flex-column gap-4">
                        {/* Config globale */}
                        <div className="card shadow-sm">
                            <div className="card-header fw-semibold">
                                <i className="fas fa-sliders-h me-2" />Paramètres globaux
                            </div>
                            <div className="card-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Montant minimum annuel (FCFA)</label>
                                    <input type="number" className="form-control form-control-sm"
                                        value={config.plancher_minimum ?? ''}
                                        onChange={e => setConfig(c => ({ ...c, plancher_minimum: e.target.value }))} />
                                    <div className="form-text">Facture minimum même pour les toutes petites écoles.</div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">TVA (%)</label>
                                        <input type="number" className="form-control form-control-sm"
                                            value={config.taux_tva ?? ''}
                                            onChange={e => setConfig(c => ({ ...c, taux_tva: e.target.value }))} />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Durée démo (jours)</label>
                                        <input type="number" className="form-control form-control-sm"
                                            value={config.duree_demo_jours ?? ''}
                                            onChange={e => setConfig(c => ({ ...c, duree_demo_jours: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        <i className="fas fa-mobile-alt me-1 text-success" />Accès parent mobile (FCFA/an)
                                    </label>
                                    <input type="number" className="form-control form-control-sm"
                                        value={config.tarif_acces_parent ?? ''}
                                        onChange={e => setConfig(c => ({ ...c, tarif_acces_parent: e.target.value }))} />
                                    <div className="form-text">Tarif unique annuel payé par chaque parent pour accéder au portail mobile.</div>
                                </div>
                                <button className="btn btn-primary btn-sm w-100" onClick={sauvegarderConfig} disabled={sauvegarde}>
                                    {sauvegarde ? <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</> : <><i className="fas fa-save me-1" />Enregistrer</>}
                                </button>
                            </div>
                        </div>

                        {/* Simulateur */}
                        <div className="card shadow-sm border-primary">
                            <div className="card-header fw-semibold text-primary">
                                <i className="fas fa-calculator me-2" />Simulateur de licence
                            </div>
                            <div className="card-body">
                                <div className="input-group mb-3">
                                    <input type="number" className="form-control" placeholder="Nombre d'élèves"
                                        value={effectifSim} onChange={e => setEffectifSim(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && simuler()} />
                                    <button className="btn btn-outline-primary" onClick={simuler}>
                                        <i className="fas fa-play" />
                                    </button>
                                </div>
                                {simulation && (
                                    <div className="p-3 rounded-3" style={{ background: '#f0f7ff', border: '1px solid #bfdbfe' }}>
                                        <div className="row g-2 small">
                                            <div className="col-6">
                                                <div className="text-muted">Prix / élève</div>
                                                <div className="fw-bold">{fmt(simulation.prix_par_eleve)} FCFA</div>
                                            </div>
                                            <div className="col-6">
                                                <div className="text-muted">Montant brut</div>
                                                <div className="fw-bold">{fmt(simulation.montant_brut)} FCFA</div>
                                            </div>
                                            {simulation.plancher_applique && (
                                                <div className="col-12">
                                                    <span className="badge bg-warning text-dark">
                                                        <i className="fas fa-exclamation-triangle me-1" />Plancher minimum appliqué
                                                    </span>
                                                </div>
                                            )}
                                            <div className="col-12 pt-2" style={{ borderTop: '1px solid #bfdbfe' }}>
                                                <div className="text-muted">Montant final HT</div>
                                                <div className="fw-bold fs-5 text-primary">{fmt(simulation.montant)} FCFA / an</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ConfigTarifs;
