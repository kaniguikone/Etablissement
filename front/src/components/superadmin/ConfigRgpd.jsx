import { useEffect, useState } from 'react';
import { centralApi as axios } from '../../api/axios';
import { useConfirm } from '../../context/ConfirmContext';

const ConfigRgpd = () => {
    const { confirmer } = useConfirm();

    const [dureeRetention, setDureeRetention] = useState('');
    const [sauvegarde, setSauvegarde] = useState(false);
    const [msgTexte, setMsgTexte] = useState('');
    const [msgOk, setMsgOk] = useState(true);

    const [tenants, setTenants] = useState([]);
    const [tenantId, setTenantId] = useState('');
    const [type, setType] = useState('eleve');
    const [recherche, setRecherche] = useState('');
    const [resultats, setResultats] = useState([]);
    const [rechercheEnCours, setRechercheEnCours] = useState(false);

    const [confirmationSuppression, setConfirmationSuppression] = useState('');
    const [suppressionEnCours, setSuppressionEnCours] = useState(false);

    const msg = (texte, ok = true) => {
        setMsgTexte(texte); setMsgOk(ok);
        setTimeout(() => setMsgTexte(''), 3500);
    };

    useEffect(() => {
        axios.get('/superadmin/rgpd/config').then(r => setDureeRetention(r.data.duree_retention_annees));
        axios.get('/superadmin/tenants').then(r => setTenants(r.data));
    }, []);

    const sauvegarderConfig = async () => {
        setSauvegarde(true);
        try {
            await axios.put('/superadmin/rgpd/config', { duree_retention_annees: parseInt(dureeRetention) || 10 });
            msg('Durée de rétention enregistrée.');
        } catch { msg("Erreur lors de l'enregistrement.", false); }
        finally { setSauvegarde(false); }
    };

    const rechercher = async () => {
        if (!tenantId || recherche.trim().length < 2) return;
        setRechercheEnCours(true);
        try {
            const r = await axios.get(`/superadmin/rgpd/tenants/${tenantId}/rechercher-personne`, { params: { q: recherche, type } });
            setResultats(r.data);
        } catch { msg('Erreur de recherche.', false); }
        finally { setRechercheEnCours(false); }
    };

    const anonymiser = async (id, libelle) => {
        if (!await confirmer(`Anonymiser définitivement "${libelle}" ? Cette action est irréversible.`)) return;
        try {
            await axios.post(`/superadmin/rgpd/tenants/${tenantId}/anonymiser`, { type, id });
            msg('Données personnelles anonymisées.');
            setResultats(r => r.filter(x => x.id !== id));
        } catch { msg("Erreur lors de l'anonymisation.", false); }
    };

    const tenantSelectionne = tenants.find(t => t.id === tenantId);

    const supprimerEtablissement = async () => {
        if (!tenantSelectionne || confirmationSuppression !== tenantSelectionne.code) return;
        if (!await confirmer(`Supprimer DÉFINITIVEMENT "${tenantSelectionne.nom}" et toutes ses données ? Aucune récupération possible.`)) return;

        setSuppressionEnCours(true);
        try {
            await axios.delete(`/superadmin/tenants/${tenantId}`, { data: { confirmation: confirmationSuppression } });
            msg('Établissement supprimé.');
            setTenants(t => t.filter(x => x.id !== tenantId));
            setTenantId('');
            setConfirmationSuppression('');
        } catch { msg('Erreur lors de la suppression.', false); }
        finally { setSuppressionEnCours(false); }
    };

    return (
        <div className="page-wrapper">
            <h4 className="mb-3 fw-bold"><i className="fas fa-user-shield me-2 text-primary" />RGPD & Conformité</h4>

            {msgTexte && <div className={`alert ${msgOk ? 'alert-success' : 'alert-danger'}`}>{msgTexte}</div>}

            {/* Durée de rétention */}
            <div className="card shadow-sm mb-4">
                <div className="card-header py-2 px-3 fw-semibold">Durée de rétention des données</div>
                <div className="card-body p-3">
                    <p className="text-muted small">
                        Affichée publiquement sur la page de politique de confidentialité.
                    </p>
                    <div className="d-flex align-items-center gap-2">
                        <input type="number" min="1" className="form-control form-control-sm" style={{ width: 100 }}
                            value={dureeRetention} onChange={e => setDureeRetention(e.target.value)} />
                        <span>ans</span>
                        <button className="btn btn-primary btn-sm ms-2" onClick={sauvegarderConfig} disabled={sauvegarde}>
                            {sauvegarde && <span className="spinner-border spinner-border-sm me-1" />}Enregistrer
                        </button>
                    </div>
                </div>
            </div>

            {/* Effacement d'une personne */}
            <div className="card shadow-sm mb-4">
                <div className="card-header py-2 px-3 fw-semibold">Droit à l&apos;effacement — anonymiser une personne</div>
                <div className="card-body p-3">
                    <div className="row g-2 align-items-end mb-3">
                        <div className="col-md-4">
                            <label className="form-label fw-medium mb-1">Établissement</label>
                            <select className="form-select form-select-sm" value={tenantId} onChange={e => { setTenantId(e.target.value); setResultats([]); }}>
                                <option value="">— Choisir —</option>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-medium mb-1">Type</label>
                            <select className="form-select form-select-sm" value={type} onChange={e => setType(e.target.value)}>
                                <option value="eleve">Élève</option>
                                <option value="parent">Parent</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-medium mb-1">Recherche (nom, matricule, numéro…)</label>
                            <input type="text" className="form-control form-control-sm" value={recherche}
                                onChange={e => setRecherche(e.target.value)} onKeyDown={e => e.key === 'Enter' && rechercher()} />
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-outline-primary btn-sm w-100" onClick={rechercher} disabled={!tenantId || rechercheEnCours}>
                                <i className="fas fa-search me-1" />Rechercher
                            </button>
                        </div>
                    </div>

                    {resultats.length > 0 && (
                        <div className="list-group">
                            {resultats.map(r => {
                                const libelle = type === 'parent'
                                    ? `${r.nom_parent} ${r.prenom_parent} (${r.numero_parent})`
                                    : `${r.nom_eleve} ${r.prenoms_eleve} (${r.matricule_eleve})`;
                                return (
                                    <div key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>{libelle}</span>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => anonymiser(r.id, libelle)}>
                                            <i className="fas fa-user-slash me-1" />Anonymiser
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Zone dangereuse : suppression d'établissement */}
            <div className="card shadow-sm border-danger mb-4">
                <div className="card-header py-2 px-3 fw-semibold text-danger">Zone dangereuse — suppression d&apos;établissement</div>
                <div className="card-body p-3">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-medium mb-1">Établissement</label>
                            <select className="form-select form-select-sm" value={tenantId} onChange={e => { setTenantId(e.target.value); setConfirmationSuppression(''); }}>
                                <option value="">— Choisir —</option>
                                {tenants.map(t => <option key={t.id} value={t.id}>{t.nom} ({t.code})</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-medium mb-1">
                                Tapez le code <strong>{tenantSelectionne?.code ?? '—'}</strong> pour confirmer
                            </label>
                            <input type="text" className="form-control form-control-sm" value={confirmationSuppression}
                                onChange={e => setConfirmationSuppression(e.target.value)} disabled={!tenantSelectionne} />
                        </div>
                        <div className="col-md-4">
                            <button className="btn btn-danger btn-sm w-100"
                                disabled={!tenantSelectionne || confirmationSuppression !== tenantSelectionne.code || suppressionEnCours}
                                onClick={supprimerEtablissement}>
                                {suppressionEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                                <i className="fas fa-trash-alt me-1" />Supprimer définitivement
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigRgpd;
