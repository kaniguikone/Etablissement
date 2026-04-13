import { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import PassageTable from './PassageTable';

const ETAPES = [
    { id: 1, label: 'Années scolaires',  icon: 'fas fa-calendar-alt' },
    { id: 2, label: 'Initier la clôture', icon: 'fas fa-lock' },
    { id: 3, label: 'Passage de classe', icon: 'fas fa-exchange-alt' },
    { id: 4, label: 'Confirmation',      icon: 'fas fa-check-double' },
    { id: 5, label: 'Nouvelle année',    icon: 'fas fa-plus-circle' },
];

const STATUT_BADGE = {
    en_cours:   { label: 'En cours',    bg: '#198754' },
    en_cloture: { label: 'En clôture', bg: '#fd7e14' },
    cloturee:   { label: 'Clôturée',   bg: '#6c757d' },
};

// ── Composant principal ────────────────────────────────────────────────────

const ArchivageWizard = () => {
    const { toast } = useToast();
    const [etape, setEtape]       = useState(1);
    const [annees, setAnnees]     = useState([]);
    const [anneeActive, setAnneeActive] = useState(null);   // année en cours ou en_cloture
    const [loading, setLoading]   = useState(false);

    // Formulaire nouvelle année
    const [formAnnee, setFormAnnee] = useState({ libelle: '', date_debut: '', date_fin: '' });
    // Formulaire init nouvelle année après clôture
    const [formInit, setFormInit] = useState({
        libelle: '', date_debut: '', date_fin: '',
        vider_emploi_du_temps: true, creer_periodes: true,
    });

    useEffect(() => { fetchAnnees(); }, []);

    const fetchAnnees = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/annees-scolaires');
            setAnnees(data);
            const active = data.find(a => a.statut === 'en_cours' || a.statut === 'en_cloture');
            setAnneeActive(active ?? null);
            // Orienter l'étape selon le statut
            if (active?.statut === 'en_cloture') setEtape(3);
        } catch {
            toast.error('Erreur lors du chargement des années scolaires.');
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
            toast.success('Clôture initiée. Passage de classe disponible.');
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
            await axios.post(`/annees-scolaires/${anneeActive.id}/confirmer`);
            toast.success('Clôture confirmée ! Les passages de classe ont été appliqués.');
            await fetchAnnees();
            setEtape(5);
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
            toast.success('Nouvelle année scolaire initialisée !');
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

            {/* Contenu par étape */}
            <div className="card shadow-sm">
                <div className="card-body p-4">

                    {/* ── Étape 1 : liste des années ── */}
                    {etape === 1 && (
                        <div>
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
                                        return (
                                            <tr key={a.id}>
                                                <td><strong>{a.libelle}</strong></td>
                                                <td>{a.date_debut}</td>
                                                <td>{a.date_fin}</td>
                                                <td><span className="badge rounded-pill" style={{ background: cfg.bg }}>{cfg.label}</span></td>
                                                <td>{a.periodes_count ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Créer nouvelle année (si aucune en cours) */}
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
                                    Continuer → Clôture <i className="fas fa-arrow-right ms-1" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Étape 2 : initier clôture ── */}
                    {etape === 2 && (
                        <div>
                            <h5 className="mb-3">Initier la clôture</h5>
                            {anneeActive ? (
                                <>
                                    <div className="alert alert-info">
                                        <i className="fas fa-info-circle me-2" />
                                        <strong>Année en cours :</strong> {anneeActive.libelle}<br />
                                        Initier la clôture passe l'année en <strong>lecture seule</strong>. Plus aucune note, absence ou paiement ne pourra être saisi.<br />
                                        Vous pourrez annuler tant que la clôture n'est pas confirmée.
                                    </div>
                                    <div className="alert alert-warning">
                                        <i className="fas fa-exclamation-triangle me-2" />
                                        Vérifiez que toutes les notes, assiduités et paiements sont bien saisis avant de continuer.
                                    </div>
                                    {anneeActive.statut === 'en_cours' && (
                                        <button className="btn btn-warning" onClick={initierCloture} disabled={loading}>
                                            <i className="fas fa-lock me-1" />Initier la clôture
                                        </button>
                                    )}
                                    {anneeActive.statut === 'en_cloture' && (
                                        <div className="d-flex gap-2">
                                            <span className="badge bg-warning text-dark align-self-center fs-6 me-2">
                                                Clôture en cours
                                            </span>
                                            <button className="btn btn-outline-danger btn-sm" onClick={rollback} disabled={loading}>
                                                <i className="fas fa-undo me-1" />Annuler la clôture
                                            </button>
                                            <button className="btn btn-primary" onClick={() => setEtape(3)}>
                                                Passage de classe <i className="fas fa-arrow-right ms-1" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="alert alert-secondary">Aucune année scolaire en cours. Créez-en une d'abord.</div>
                            )}
                        </div>
                    )}

                    {/* ── Étape 3 : passage de classe ── */}
                    {etape === 3 && anneeActive && (
                        <PassageTable
                            anneeId={anneeActive.id}
                            toast={toast}
                            onConfirmer={() => setEtape(4)}
                            onRollback={rollback}
                        />
                    )}

                    {/* ── Étape 4 : confirmation ── */}
                    {etape === 4 && (
                        <div>
                            <h5 className="mb-3">Confirmation définitive</h5>
                            <div className="alert alert-danger">
                                <i className="fas fa-exclamation-triangle me-2" />
                                <strong>Action irréversible.</strong> La confirmation va :
                                <ul className="mb-0 mt-2">
                                    <li>Appliquer les passages de classe sur chaque élève</li>
                                    <li>Mettre les élèves diplômés/sortis en statut final</li>
                                    <li>Archiver définitivement l'année <strong>{anneeActive?.libelle}</strong></li>
                                </ul>
                            </div>
                            {anneeActive?.statut === 'en_cloture' ? (
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-secondary" onClick={() => setEtape(3)}>
                                        <i className="fas fa-arrow-left me-1" />Retour passage
                                    </button>
                                    <button className="btn btn-danger" onClick={confirmer} disabled={loading}>
                                        <i className="fas fa-check-double me-1" />Confirmer la clôture définitive
                                    </button>
                                </div>
                            ) : (
                                <div className="alert alert-success">
                                    <i className="fas fa-check-circle me-2" />
                                    L'année <strong>{anneeActive?.libelle}</strong> est clôturée.
                                    <button className="btn btn-primary ms-3" onClick={() => setEtape(5)}>
                                        Initialiser la nouvelle année
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Étape 5 : nouvelle année ── */}
                    {etape === 5 && (
                        <div>
                            <h5 className="mb-3">Initialiser la nouvelle année scolaire</h5>
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
