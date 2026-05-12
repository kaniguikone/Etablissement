import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ETAPES = [
    { id: 1, label: 'Années scolaires', icon: 'fas fa-calendar-alt' },
    { id: 2, label: 'Prérequis',        icon: 'fas fa-clipboard-check' },
    { id: 3, label: 'Confirmation',     icon: 'fas fa-check-double' },
    { id: 4, label: 'Nouvelle année',   icon: 'fas fa-plus-circle' },
];

const STATUT_BADGE = {
    en_cours:   { label: 'En cours',   bg: '#198754' },
    en_cloture: { label: 'En clôture', bg: '#fd7e14' },
    cloturee:   { label: 'Clôturée',   bg: '#6c757d' },
};

const ArchivageWizard = () => {
    const { toast } = useToast();
    const [etape, setEtape]               = useState(1);
    const [annees, setAnnees]             = useState([]);
    const [anneeActive, setAnneeActive]   = useState(null);
    const [loading, setLoading]           = useState(false);
    const [prerequis, setPrerequis]       = useState(null);
    const [bilanPreview, setBilanPreview] = useState(null);

    const [formAnnee, setFormAnnee]       = useState({ libelle: '', date_debut: '', date_fin: '' });
    const [formInit, setFormInit]         = useState({
        libelle: '', date_debut: '', date_fin: '',
        vider_emploi_du_temps: true, creer_periodes: true,
    });
    const [succesArchivage, setSuccesArchivage] = useState(null); // { anneeArchivee, nouvelleAnnee }
    const [backupInfo, setBackupInfo]           = useState(null); // { success, fichier?, taille?, message? }

    useEffect(() => { fetchAnnees(); }, []);

    useEffect(() => {
        if (etape === 2 && anneeActive?.id) fetchPrerequis(anneeActive.id);
    }, [etape, anneeActive?.id]);

    useEffect(() => {
        if (etape === 3 && anneeActive?.statut === 'en_cloture') fetchBilanPreview(anneeActive.id);
    }, [etape, anneeActive?.statut]);

    const fetchAnnees = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/annees-scolaires');
            setAnnees(data);
            const active = data.find(a => a.statut === 'en_cours' || a.statut === 'en_cloture');
            setAnneeActive(active ?? null);
            if (active?.statut === 'en_cloture') setEtape(3);
        } catch {
            toast.error('Erreur lors du chargement des années scolaires.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrerequis = async (anneeId) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/annees-scolaires/${anneeId}/prerequis`);
            setPrerequis(data);
        } catch {
            toast.error('Erreur lors de la vérification des prérequis.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBilanPreview = async (anneeId) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/annees-scolaires/${anneeId}/bilan-preview`);
            setBilanPreview(data);
        } catch {
            toast.error('Erreur lors du chargement du bilan prévisionnel.');
        } finally {
            setLoading(false);
        }
    };

    // ── Actions ────────────────────────────────────────────────────────────

    const creerAnnee = async () => {
        setLoading(true);
        try {
            await axios.post('/annees-scolaires', formAnnee);
            toast.success('Année scolaire créée.');
            setFormAnnee({ libelle: '', date_debut: '', date_fin: '' });
            await fetchAnnees();
            setEtape(2);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur lors de la création.');
        } finally {
            setLoading(false);
        }
    };

    const initierCloture = async () => {
        if (!anneeActive) return;
        setLoading(true);
        try {
            await axios.post(`/annees-scolaires/${anneeActive.id}/initier-cloture`);
            toast.success('Clôture initiée. L\'année est maintenant en lecture seule.');
            await fetchAnnees();
            setEtape(3);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur.');
        } finally {
            setLoading(false);
        }
    };

    const rollback = async () => {
        if (!anneeActive) return;
        setLoading(true);
        try {
            await axios.post(`/annees-scolaires/${anneeActive.id}/rollback`);
            toast.success('Clôture annulée. L\'année est de nouveau en cours.');
            setBilanPreview(null);
            await fetchAnnees();
            setEtape(2);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur.');
        } finally {
            setLoading(false);
        }
    };

    const confirmer = async () => {
        if (!anneeActive) return;
        setLoading(true);
        try {
            const { data } = await axios.post(`/annees-scolaires/${anneeActive.id}/confirmer`);
            setBackupInfo(data.backup ?? null);
            toast.success('Clôture confirmée ! Les passages de classe ont été appliqués.');
            await fetchAnnees();
            setEtape(4);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur.');
        } finally {
            setLoading(false);
        }
    };

    const initNouvelleAnnee = async () => {
        setLoading(true);
        try {
            await axios.post('/annees-scolaires/init-nouvelle-annee', formInit);
            setSuccesArchivage({
                anneeArchivee: anneeActive?.libelle,
                nouvelleAnnee: formInit.libelle,
            });
            setFormInit({ libelle: '', date_debut: '', date_fin: '', vider_emploi_du_temps: true, creer_periodes: true });
            await fetchAnnees();
            setEtape(1);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur.');
        } finally {
            setLoading(false);
        }
    };

    // ── Rendu ──────────────────────────────────────────────────────────────

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>
            <h4 className="mb-4">
                <i className="fas fa-archive me-2 text-primary" />
                Archivage fin d'année
            </h4>

            {/* Stepper */}
            <div className="d-flex align-items-center mb-4 gap-0">
                {ETAPES.map((e, idx) => (
                    <div key={e.id} className="d-flex align-items-center" style={{ flex: 1 }}>
                        <div
                            onClick={() => setEtape(e.id)}
                            style={{
                                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                                background: etape === e.id ? '#0d6efd' : etape > e.id ? '#198754' : '#e9ecef',
                                color: etape >= e.id ? '#fff' : '#6c757d',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 14, flexShrink: 0, transition: 'background .2s',
                            }}
                        >
                            {etape > e.id ? <i className="fas fa-check" /> : e.id}
                        </div>
                        <div style={{ marginLeft: 6, fontSize: 12, color: etape === e.id ? '#0d6efd' : '#6c757d', whiteSpace: 'nowrap' }}>
                            {e.label}
                        </div>
                        {idx < ETAPES.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: etape > e.id ? '#198754' : '#dee2e6', margin: '0 8px' }} />
                        )}
                    </div>
                ))}
            </div>

            <div className="card shadow-sm">
                <div className="card-body p-4">

                    {/* ── Étape 1 : liste des années ── */}
                    {etape === 1 && (
                        <div>
                            {succesArchivage && (
                                <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
                                    <div>
                                        <i className="fas fa-check-circle me-2 fs-5" />
                                        <strong>Archivage terminé avec succès !</strong>
                                        <div className="mt-1 small">
                                            L'année <strong>{succesArchivage.anneeArchivee}</strong> est clôturée définitivement.
                                            Vous êtes maintenant dans l'année scolaire <strong>{succesArchivage.nouvelleAnnee}</strong>.
                                        </div>
                                    </div>
                                    <button className="btn-close" onClick={() => setSuccesArchivage(null)} />
                                </div>
                            )}

                            <h5 className="mb-3">Années scolaires</h5>
                            <table className="table table-hover mb-4">
                                <thead className="table-light">
                                    <tr><th>Libellé</th><th>Début</th><th>Fin</th><th>Statut</th><th>Périodes</th></tr>
                                </thead>
                                <tbody>
                                    {annees.length === 0 && (
                                        <tr><td colSpan={5} className="text-center text-muted">Aucune année scolaire</td></tr>
                                    )}
                                    {annees.map(a => {
                                        const cfg = STATUT_BADGE[a.statut] ?? { label: a.statut, bg: '#6c757d' };
                                        const estEnCours = a.statut === 'en_cours';
                                        return (
                                            <tr key={a.id} className={estEnCours ? 'table-success' : ''}>
                                                <td>
                                                    <strong>{a.libelle}</strong>
                                                    {estEnCours && (
                                                        <span className="ms-2 badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: 11 }}>
                                                            <i className="fas fa-circle me-1" style={{ fontSize: 8 }} />Année en cours
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{a.date_debut}</td>
                                                <td>{a.date_fin}</td>
                                                <td><span className="badge rounded-pill" style={{ background: cfg.bg }}>{cfg.label}</span></td>
                                                <td>{a.periodes_count ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {!anneeActive && (
                                <>
                                    <h6 className="mb-3">Créer une année scolaire</h6>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label">Libellé (ex: 2025-2026)</label>
                                            <input className="form-control" value={formAnnee.libelle}
                                                onChange={e => setFormAnnee(f => ({ ...f, libelle: e.target.value }))} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Date début</label>
                                            <input type="date" className="form-control" value={formAnnee.date_debut}
                                                onChange={e => setFormAnnee(f => ({ ...f, date_debut: e.target.value }))} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Date fin</label>
                                            <input type="date" className="form-control" value={formAnnee.date_fin}
                                                onChange={e => setFormAnnee(f => ({ ...f, date_fin: e.target.value }))} />
                                        </div>
                                        <div className="col-md-2 d-flex align-items-end">
                                            <button className="btn btn-primary w-100" onClick={creerAnnee} disabled={loading}>
                                                <i className="fas fa-plus me-1" />Créer
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            {anneeActive && (
                                <button className="btn btn-primary" onClick={() => setEtape(2)}>
                                    Continuer → Prérequis <i className="fas fa-arrow-right ms-1" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Étape 2 : vérification prérequis ── */}
                    {etape === 2 && (
                        <div>
                            <h5 className="mb-3">Vérification des prérequis</h5>

                            {anneeActive?.statut === 'en_cloture' && (
                                <div className="alert alert-warning d-flex align-items-center gap-2">
                                    <i className="fas fa-lock fs-5" />
                                    <div>
                                        <strong>Clôture déjà initiée</strong> pour {anneeActive.libelle}.
                                        Vous pouvez annuler ou continuer vers la confirmation.
                                    </div>
                                </div>
                            )}

                            {anneeActive?.statut === 'en_cours' && (
                                <div className="alert alert-info">
                                    <i className="fas fa-info-circle me-2" />
                                    Le conseil de classe est souverain. Vérifiez que les décisions ont bien été
                                    saisies pour <strong>toutes les classes</strong> lors de la dernière période
                                    avant d'initier la clôture.
                                </div>
                            )}

                            {loading && !prerequis && (
                                <div className="text-center py-3 text-muted">
                                    <i className="fas fa-spinner fa-spin me-2" />Vérification en cours…
                                </div>
                            )}

                            {prerequis && (
                                <>
                                    {prerequis.derniere_periode && (
                                        <p className="text-muted mb-2">
                                            <i className="fas fa-calendar-check me-1" />
                                            Dernière période vérifiée : <strong>{prerequis.derniere_periode.libelle_periode}</strong>
                                        </p>
                                    )}

                                    {prerequis.classes.length === 0 ? (
                                        <div className="alert alert-secondary">Aucune classe active avec des élèves.</div>
                                    ) : (
                                        <table className="table table-sm table-hover mb-3">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Classe</th>
                                                    <th className="text-center">Élèves</th>
                                                    <th className="text-center">Décisions saisies</th>
                                                    <th className="text-center">Manquants</th>
                                                    <th className="text-center">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prerequis.classes.map(c => (
                                                    <tr key={c.classe_id}>
                                                        <td>{c.classe}</td>
                                                        <td className="text-center">{c.nb_eleves}</td>
                                                        <td className="text-center">{c.nb_decisions}</td>
                                                        <td className="text-center">
                                                            {c.nb_manquants > 0 && (
                                                                <span className="text-danger fw-bold">{c.nb_manquants}</span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            {c.ok
                                                                ? <i className="fas fa-check-circle text-success" />
                                                                : <i className="fas fa-exclamation-circle text-danger" />
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {!prerequis.pret && (
                                        <div className="alert alert-danger">
                                            <i className="fas fa-exclamation-triangle me-2" />
                                            Des décisions de conseil sont manquantes. Complétez les conseils de classe avant de clôturer.
                                        </div>
                                    )}
                                    {prerequis.pret && anneeActive?.statut === 'en_cours' && (
                                        <div className="alert alert-success">
                                            <i className="fas fa-check-circle me-2" />
                                            Tous les conseils sont complets. Vous pouvez initier la clôture.
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="d-flex gap-2 mt-3">
                                {anneeActive?.statut === 'en_cloture' && (
                                    <>
                                        <button className="btn btn-outline-danger btn-sm" onClick={rollback} disabled={loading}>
                                            <i className="fas fa-undo me-1" />Annuler la clôture
                                        </button>
                                        <button className="btn btn-primary" onClick={() => setEtape(3)}>
                                            Continuer → Confirmation <i className="fas fa-arrow-right ms-1" />
                                        </button>
                                    </>
                                )}
                                {anneeActive?.statut === 'en_cours' && (
                                    <button
                                        className="btn btn-warning"
                                        onClick={initierCloture}
                                        disabled={loading || !prerequis?.pret}
                                    >
                                        <i className="fas fa-lock me-1" />Initier la clôture
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Étape 3 : confirmation ── */}
                    {etape === 3 && (
                        <div>
                            <h5 className="mb-3">Confirmation définitive</h5>

                            {loading && !bilanPreview && (
                                <div className="text-center py-3 text-muted">
                                    <i className="fas fa-spinner fa-spin me-2" />Calcul du bilan en cours…
                                </div>
                            )}

                            {bilanPreview && (
                                <>
                                    <p className="text-muted mb-3">
                                        Bilan calculé automatiquement depuis les décisions du conseil —{' '}
                                        période <strong>{bilanPreview.derniere_periode?.libelle_periode}</strong>.
                                    </p>
                                    <div className="row g-3 mb-4">
                                        {[
                                            { key: 'promu',      label: 'Promus',      color: '#198754', icon: 'fas fa-arrow-up' },
                                            { key: 'redoublant', label: 'Redoublants', color: '#fd7e14', icon: 'fas fa-redo' },
                                            { key: 'diplome',    label: 'Diplômés',    color: '#0d6efd', icon: 'fas fa-graduation-cap' },
                                            { key: 'sorti',      label: 'Sortis',      color: '#6c757d', icon: 'fas fa-sign-out-alt' },
                                        ].map(({ key, label, color, icon }) => (
                                            <div key={key} className="col-6 col-md-3">
                                                <div className="card text-center border-0 shadow-sm">
                                                    <div className="card-body py-3">
                                                        <i className={`${icon} fa-2x mb-2`} style={{ color }} />
                                                        <div className="fs-3 fw-bold" style={{ color }}>
                                                            {bilanPreview.stats?.[key] ?? 0}
                                                        </div>
                                                        <div className="text-muted small">{label}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="alert alert-info">
                                <i className="fas fa-database me-2" />
                                <strong>Backup automatique</strong> — Un dump de la base de données sera créé
                                automatiquement dans <code>storage/app/backups/</code> juste avant la confirmation.
                                Nous vous recommandons également d'effectuer un <strong>backup manuel</strong> au préalable
                                (via votre hébergeur ou <code>mysqldump</code>) pour une sécurité maximale.
                            </div>

                            <div className="alert alert-danger">
                                <i className="fas fa-exclamation-triangle me-2" />
                                <strong>Action irréversible.</strong> La confirmation va appliquer les passages sur
                                chaque élève et archiver définitivement l'année{' '}
                                <strong>{anneeActive?.libelle}</strong>.
                            </div>

                            {anneeActive?.statut === 'en_cloture' ? (
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-danger btn-sm" onClick={rollback} disabled={loading}>
                                        <i className="fas fa-undo me-1" />Annuler la clôture
                                    </button>
                                    <button className="btn btn-danger" onClick={confirmer} disabled={loading || !bilanPreview}>
                                        <i className="fas fa-check-double me-1" />Confirmer la clôture définitive
                                    </button>
                                </div>
                            ) : (
                                <div className="alert alert-success">
                                    <i className="fas fa-check-circle me-2" />
                                    L'année <strong>{anneeActive?.libelle}</strong> est clôturée.
                                    <button className="btn btn-primary ms-3" onClick={() => setEtape(4)}>
                                        Initialiser la nouvelle année
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Étape 4 : nouvelle année ── */}
                    {etape === 4 && (
                        <div>
                            <h5 className="mb-3">Initialiser la nouvelle année scolaire</h5>

                            {backupInfo && (
                                backupInfo.success ? (
                                    <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3">
                                        <i className="fas fa-shield-alt fs-5" />
                                        <div>
                                            <strong>Backup créé avec succès</strong> —{' '}
                                            <code>{backupInfo.fichier}</code> ({backupInfo.taille})
                                            <div className="small text-muted mt-1">
                                                Fichier disponible dans <code>storage/app/backups/</code> sur le serveur.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3">
                                        <i className="fas fa-exclamation-triangle fs-5" />
                                        <div>
                                            <strong>Backup automatique non disponible</strong> — {backupInfo.message}
                                            <div className="small text-muted mt-1">
                                                La clôture a bien été appliquée. Vérifiez que <code>mysqldump</code> est
                                                installé sur le serveur pour les prochaines clôtures.
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label">Libellé (ex: 2026-2027)</label>
                                    <input className="form-control" value={formInit.libelle}
                                        onChange={e => setFormInit(f => ({ ...f, libelle: e.target.value }))} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Date début</label>
                                    <input type="date" className="form-control" value={formInit.date_debut}
                                        onChange={e => setFormInit(f => ({ ...f, date_debut: e.target.value }))} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Date fin</label>
                                    <input type="date" className="form-control" value={formInit.date_fin}
                                        onChange={e => setFormInit(f => ({ ...f, date_fin: e.target.value }))} />
                                </div>
                            </div>
                            <div className="mt-3 d-flex gap-4">
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="viderEdt"
                                        checked={formInit.vider_emploi_du_temps}
                                        onChange={e => setFormInit(f => ({ ...f, vider_emploi_du_temps: e.target.checked }))} />
                                    <label className="form-check-label" htmlFor="viderEdt">
                                        Vider l'emploi du temps
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="creerPeriodes"
                                        checked={formInit.creer_periodes}
                                        onChange={e => setFormInit(f => ({ ...f, creer_periodes: e.target.checked }))} />
                                    <label className="form-check-label" htmlFor="creerPeriodes">
                                        Créer 3 périodes (T1, T2, T3) par défaut
                                    </label>
                                </div>
                            </div>
                            <button className="btn btn-success mt-4" onClick={initNouvelleAnnee} disabled={loading}>
                                <i className="fas fa-plus-circle me-1" />Initialiser la nouvelle année
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ArchivageWizard;
