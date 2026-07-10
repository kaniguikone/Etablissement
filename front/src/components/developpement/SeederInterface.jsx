import { useEffect, useRef, useState } from 'react';
import { centralApi } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ANNEE_COURANTE = (() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const TEMPLATES = {
    lycee_complet: { label: 'Lycée Complet (6ème → Terminale)', nb_niveaux: 7, nb_matieres: 17 },
    college:       { label: 'Collège (6ème → 3ème)',            nb_niveaux: 4, nb_matieres: 16 },
    lycee:         { label: 'Lycée (Seconde → Terminale)',       nb_niveaux: 3, nb_matieres: 17 },
    primaire:      { label: 'École Primaire (CP1 → CM2)',        nb_niveaux: 6, nb_matieres: 11 },
};

const DEFAUTS = {
    template:              'lycee_complet',
    classes_min:           1,
    classes_max:           3,
    eleves_min:            10,
    eleves_max:            20,
    nb_enseignants:        35,
    annee:                 ANNEE_COURANTE,
    periodes_type:         'trimestre',
    avec_eleves:           true,
    avec_emploi:           true,
    avec_devoirs:          true,
    avec_paiements:        true,
    devoirs_min:           1,
    devoirs_max:           2,
    assiduites_par_periode: 3,
};
const POLL_MS     = 2000;

const MODULES = [
    { name: 'avec_emploi',    label: 'Emploi du temps',             icon: 'fas fa-calendar-week' },
    { name: 'avec_devoirs',   label: 'Devoirs, notes & assiduités', icon: 'fas fa-file-alt',   req: 'avec_eleves' },
    { name: 'avec_paiements', label: 'Paiements & impayés',         icon: 'fas fa-wallet',     req: 'avec_eleves' },
];

const RangeRow = ({ label, nameMin, nameMax, min, max, params, onChange }) => {
    const moy = Math.round((params[nameMin] + params[nameMax]) / 2);
    return (
        <div className="mb-3">
            <label className="form-label fw-semibold">{label}</label>
            <div className="d-flex align-items-center gap-2">
                <div className="flex-fill">
                    <label className="form-label small text-muted mb-1">Min</label>
                    <input type="number" name={nameMin} value={params[nameMin]}
                        min={min} max={params[nameMax]} onChange={onChange}
                        className="form-control form-control-sm" />
                </div>
                <div className="pt-3 text-muted">→</div>
                <div className="flex-fill">
                    <label className="form-label small text-muted mb-1">Max</label>
                    <input type="number" name={nameMax} value={params[nameMax]}
                        min={params[nameMin]} max={max} onChange={onChange}
                        className="form-control form-control-sm" />
                </div>
                <div className="pt-3">
                    <span className="badge bg-secondary">~{moy} moy.</span>
                </div>
            </div>
        </div>
    );
};

const SeederInterface = () => {
    const { toast } = useToast();

    const [tenants, setTenants]       = useState([]);
    const [tenantId, setTenantId]     = useState('');
    const [loadingTenants, setLoadingTenants] = useState(true);

    const guessTemplate = (tenant) => {
        const hay = ((tenant?.nom ?? '') + ' ' + (tenant?.id ?? '')).toLowerCase();
        if (hay.includes('primaire') || hay.includes('ecole') || hay.includes('école')) return 'primaire';
        if (hay.includes('college') || hay.includes('collège'))                          return 'college';
        if (hay.includes('lycee_complet') || hay.includes('lycée complet'))              return 'lycee_complet';
        if (hay.includes('lycee') || hay.includes('lycée'))                              return 'lycee_complet';
        return 'lycee_complet';
    };

    const [params, setParams]       = useState(DEFAUTS);
    const [confirmer, setConfirmer] = useState(false);

    // État du job en cours
    const [jobId, setJobId]         = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [etape, setEtape]         = useState('');
    const [stats, setStats]         = useState(null);
    const [errors, setErrors]       = useState({});

    const pollRef = useRef(null);

    // ── Chargement des tenants ────────────────────────────────────────────────
    useEffect(() => {
        centralApi.get('/superadmin/tenants')
            .then(({ data }) => {
                const liste = data.data ?? data;
                setTenants(liste);
                if (liste.length > 0) {
                    setTenantId(liste[0].id);
                    setParams(p => ({ ...p, template: guessTemplate(liste[0]) }));
                }
            })
            .catch(() => toast.error('Impossible de charger la liste des établissements.'))
            .finally(() => setLoadingTenants(false));
    }, []);

    // ── Polling ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!jobId) return;

        const poll = async () => {
            try {
                const { data } = await centralApi.get(`/superadmin/seeder/status/${jobId}`);
                setJobStatus(data.status);
                setEtape(data.etape || '');
                if (data.stats)  setStats(data.stats);
                if (data.errors) setErrors(data.errors);

                if (data.status === 'done') {
                    clearInterval(pollRef.current);
                    toast.success('Seed terminé avec succès !');
                } else if (data.status === 'error') {
                    clearInterval(pollRef.current);
                    toast.error('Le seed a rencontré une erreur.');
                }
            } catch {
                // silencieux — le polling continue
            }
        };

        poll();
        pollRef.current = setInterval(poll, POLL_MS);
        return () => clearInterval(pollRef.current);
    }, [jobId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setParams(p => ({
            ...p,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
        }));
    };

    const lancer = async () => {
        setConfirmer(false);
        setJobId(null);
        setJobStatus(null);
        setStats(null);
        setErrors({});
        setEtape('');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
            const { data } = await centralApi.post('/superadmin/seeder/lancer', { ...params, tenant_id: tenantId });
            setJobId(data.job_id);
            setJobStatus('pending');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Impossible de démarrer le seed.');
        }
    };

    // ── Estimations ──────────────────────────────────────────────────────────
    const tplInfo    = TEMPLATES[params.template] ?? TEMPLATES.lycee_complet;
    const NB_NIVEAUX  = tplInfo.nb_niveaux;
    const NB_MATIERES = tplInfo.nb_matieres;
    const classesMoy = Math.round((params.classes_min + params.classes_max) / 2);
    const elevesMoy  = Math.round((params.eleves_min  + params.eleves_max)  / 2);
    const estClasses = NB_NIVEAUX * classesMoy;
    const estEleves  = params.avec_eleves ? estClasses * elevesMoy : 0;

    const enCours    = jobStatus === 'pending' || jobStatus === 'running';
    const termine    = jobStatus === 'done' || jobStatus === 'error';
    const hasErrors  = Object.keys(errors).length > 0;

    return (
        <div className="container-fluid mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
                <i className="fas fa-database fa-lg text-primary" />
                <div>
                    <h4 className="mb-0">Interface de Seed</h4>
                    <small className="text-muted">Génération de données de test — développement uniquement</small>
                </div>
            </div>

            {/* ── Sélecteur de tenant ── */}
            <div className="card border mb-4">
                <div className="card-body py-3">
                    <label className="form-label fw-semibold mb-1">
                        <i className="fas fa-school me-2 text-primary" />Établissement cible
                    </label>
                    {loadingTenants ? (
                        <div className="text-muted small"><i className="fas fa-spinner fa-spin me-2" />Chargement…</div>
                    ) : (
                        <select className="form-select" value={tenantId}
                            onChange={e => {
                                const t = tenants.find(x => x.id === e.target.value);
                                setTenantId(e.target.value);
                                setParams(p => ({ ...p, template: guessTemplate(t) }));
                            }}
                            disabled={enCours}>
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.nom || t.id} — {t.id}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="alert alert-warning d-flex align-items-center gap-2 mb-4">
                <i className="fas fa-exclamation-triangle fa-lg flex-shrink-0" />
                <span>
                    <strong>Attention :</strong> cette opération <strong>efface toutes les données</strong> de
                    l'établissement sélectionné. Le seed tourne en arrière-plan — vous pouvez continuer à naviguer.
                </span>
            </div>

            {/* ── Barre de statut plein-largeur ── */}
            {enCours && (
                <div className="card border-primary mb-4" style={{ borderWidth: 2 }}>
                    <div className="card-body py-3">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <i className="fas fa-spinner fa-spin text-primary fa-xl" />
                            <div className="flex-fill">
                                <div className="fw-bold text-primary">Seed en cours…</div>
                                <div className="text-muted small">{etape || 'Démarrage…'}</div>
                            </div>
                            {stats && Object.keys(stats).length > 0 && (
                                <div className="text-end small text-muted d-none d-md-block">
                                    {Object.entries(stats).slice(-2).map(([k, v]) => (
                                        <div key={k}>{k.replace(/_/g, ' ')} : <strong>{v}</strong></div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="progress" style={{ height: 8 }}>
                            <div className="progress-bar progress-bar-striped progress-bar-animated w-100 bg-primary" />
                        </div>
                    </div>
                </div>
            )}

            {termine && (
                <div className={`alert ${hasErrors ? 'alert-warning' : 'alert-success'} d-flex align-items-center gap-2 mb-4`}>
                    <i className={`fas ${hasErrors ? 'fa-exclamation-triangle' : 'fa-check-circle'} fa-lg flex-shrink-0`} />
                    <span>
                        <strong>{hasErrors ? 'Seed terminé avec des erreurs.' : 'Seed terminé avec succès !'}</strong>
                        {stats && <span className="ms-2 text-muted small">
                            {Object.entries(stats).map(([k, v]) => `${k.replace(/_/g, ' ')} : ${v}`).join(' · ')}
                        </span>}
                    </span>
                </div>
            )}

            <div className="row g-4">

                {/* ── Colonne gauche : paramètres ── */}
                <div className="col-lg-7">
                    <div className="card border mb-4">
                        <div className="card-header bg-white border-bottom fw-semibold">
                            <i className="fas fa-school me-2 text-primary" />Structure scolaire
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Cycle scolaire</label>
                                <select name="template" value={params.template}
                                    className="form-select" disabled>
                                    {Object.entries(TEMPLATES).map(([key, t]) => (
                                        <option key={key} value={key}>{t.label}</option>
                                    ))}
                                </select>
                                <div className="form-text text-muted">
                                    <i className="fas fa-lock me-1" />Déduit de l'établissement sélectionné
                                </div>
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Année scolaire</label>
                                    <input type="text" name="annee" value={params.annee}
                                        onChange={handleChange} placeholder="2024-2025"
                                        className="form-control" disabled={enCours} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Périodes</label>
                                    <select name="periodes_type" value={params.periodes_type}
                                        onChange={handleChange} className="form-select" disabled={enCours}>
                                        <option value="trimestre">Trimestres (3)</option>
                                        <option value="semestre">Semestres (2)</option>
                                    </select>
                                </div>
                            </div>
                            <RangeRow label="Classes par niveau"
                                nameMin="classes_min" nameMax="classes_max"
                                min={1} max={15} params={params} onChange={handleChange} />
                            <div className="mb-0">
                                <label className="form-label fw-semibold">Nombre d'enseignants</label>
                                <div className="d-flex align-items-center gap-2">
                                    <input type="number" name="nb_enseignants" value={params.nb_enseignants}
                                        min={1} max={200} onChange={handleChange}
                                        className="form-control" style={{ maxWidth: 120 }} disabled={enCours} />
                                    <span className="text-muted small">enseignants</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card border mb-4">
                        <div className="card-header bg-white border-bottom fw-semibold">
                            <i className="fas fa-user-graduate me-2 text-primary" />Élèves
                        </div>
                        <div className="card-body">
                            <div className="form-check form-switch mb-3">
                                <input className="form-check-input" type="checkbox" role="switch"
                                    id="avecEleves" name="avec_eleves"
                                    checked={params.avec_eleves} onChange={handleChange} disabled={enCours} />
                                <label className="form-check-label fw-semibold" htmlFor="avecEleves">
                                    Générer des élèves et parents
                                </label>
                            </div>
                            {params.avec_eleves && (
                                <RangeRow label="Élèves par classe"
                                    nameMin="eleves_min" nameMax="eleves_max"
                                    min={1} max={60} params={params} onChange={handleChange} />
                            )}
                        </div>
                    </div>

                    <div className="card border">
                        <div className="card-header bg-white border-bottom fw-semibold">
                            <i className="fas fa-puzzle-piece me-2 text-primary" />Modules optionnels
                        </div>
                        <div className="card-body pb-2">
                            {MODULES.map(({ name, label, icon, req }) => {
                                const disabled = enCours || (req && !params[req]);
                                return (
                                    <div key={name} className={`form-check form-switch mb-3 ${disabled ? 'opacity-50' : ''}`}>
                                        <input className="form-check-input" type="checkbox" role="switch"
                                            id={name} name={name}
                                            checked={params[name] && !(req && !params[req])}
                                            onChange={handleChange} disabled={disabled} />
                                        <label className="form-check-label" htmlFor={name}>
                                            <i className={`${icon} me-2 text-secondary`} />{label}
                                            {req && !params[req] && (
                                                <span className="text-muted ms-2 small">(nécessite des élèves)</span>
                                            )}
                                        </label>
                                    </div>
                                );
                            })}

                            {params.avec_devoirs && params.avec_eleves && (
                                <div className="border-top pt-3 mt-1">
                                    <RangeRow label="Devoirs par matière × période"
                                        nameMin="devoirs_min" nameMax="devoirs_max"
                                        min={1} max={5} params={params} onChange={handleChange} />
                                    <div className="mb-0">
                                        <label className="form-label fw-semibold">Séances d'assiduité par période</label>
                                        <div className="d-flex align-items-center gap-2">
                                            <input type="number" name="assiduites_par_periode"
                                                value={params.assiduites_par_periode}
                                                min={1} max={8} onChange={handleChange}
                                                className="form-control form-control-sm" style={{ maxWidth: 80 }}
                                                disabled={enCours} />
                                            <span className="text-muted small">séances / période / matière</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Colonne droite : résumé + action + progression ── */}
                <div className="col-lg-5">
                    <div className="card border mb-4">
                        <div className="card-header bg-white border-bottom fw-semibold">
                            <i className="fas fa-calculator me-2 text-primary" />Estimation
                        </div>
                        <div className="card-body p-0">
                            <table className="table table-sm table-borderless mb-0">
                                <tbody>
                                    {[
                                        ['Niveaux',     NB_NIVEAUX,                                  'fas fa-layer-group'],
                                        ['Matières',    NB_MATIERES,                                 'fas fa-book'],
                                        ['Périodes',    params.periodes_type === 'semestre' ? 2 : 3, 'fas fa-calendar-alt'],
                                        ['Classes',     `~${estClasses}`,                            'fas fa-school'],
                                        ['Enseignants', params.nb_enseignants,                       'fas fa-chalkboard-teacher'],
                                        ...(params.avec_eleves ? [
                                            ['Élèves',  `~${estEleves}`,                             'fas fa-user-graduate'],
                                            ['Parents', `~${Math.round(estEleves / 2.5)}`,           'fas fa-user-friends'],
                                        ] : []),
                                    ].map(([lbl, val, icon]) => (
                                        <tr key={lbl}>
                                            <td className="ps-3 text-muted"><i className={`${icon} me-2`} />{lbl}</td>
                                            <td className="pe-3 text-end fw-semibold">{val}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bouton / confirmation */}
                    {!confirmer && !enCours && (
                        <button className="btn btn-danger w-100 py-2 mb-3"
                            onClick={() => setConfirmer(true)}>
                            <i className="fas fa-play me-2" />Lancer le seed
                        </button>
                    )}

                    {confirmer && !enCours && (
                        <div className="card border border-danger mb-3">
                            <div className="card-body text-center">
                                <p className="mb-3">
                                    <i className="fas fa-exclamation-triangle text-danger me-2" />
                                    <strong>Toutes les données seront effacées.</strong>
                                    <br /><span className="text-muted small">Cette action est irréversible.</span>
                                </p>
                                <div className="d-flex gap-2 justify-content-center">
                                    <button className="btn btn-outline-secondary" onClick={() => setConfirmer(false)}>
                                        Annuler
                                    </button>
                                    <button className="btn btn-danger" onClick={lancer}>
                                        <i className="fas fa-check me-1" />Confirmer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progression */}
                    {enCours && (
                        <div className="card border border-primary mb-3">
                            <div className="card-body">
                                <div className="d-flex align-items-center gap-3 mb-2">
                                    <i className="fas fa-spinner fa-spin text-primary fa-lg" />
                                    <span className="fw-semibold">Seed en cours…</span>
                                </div>
                                <div className="text-muted small">{etape || 'Démarrage…'}</div>
                                <div className="progress mt-2" style={{ height: 6 }}>
                                    <div className="progress-bar progress-bar-striped progress-bar-animated w-100" />
                                </div>
                                {stats && Object.keys(stats).length > 0 && (
                                    <div className="mt-3 small text-muted">
                                        {Object.entries(stats).slice(-3).map(([k, v]) => (
                                            <div key={k}><span className="text-capitalize">{k.replace(/_/g, ' ')}</span> : <strong>{v}</strong></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Résultats finaux */}
                    {termine && (
                        <>
                            {hasErrors && (
                                <div className="card border border-danger mb-3">
                                    <div className="card-header bg-white border-bottom fw-semibold text-danger">
                                        <i className="fas fa-exclamation-circle me-2" />Erreurs détectées
                                    </div>
                                    <div className="card-body p-0">
                                        <table className="table table-sm mb-0">
                                            <tbody>
                                                {Object.entries(errors).map(([seeder, msg]) => (
                                                    <tr key={seeder}>
                                                        <td className="ps-3 fw-semibold text-danger text-nowrap">{seeder}</td>
                                                        <td className="pe-3 small text-muted" style={{ wordBreak: 'break-all' }}>{msg}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {stats && Object.keys(stats).length > 0 && (
                                <div className={`card border ${hasErrors ? 'border-warning' : 'border-success'}`}>
                                    <div className={`card-header bg-white border-bottom fw-semibold ${hasErrors ? 'text-warning' : 'text-success'}`}>
                                        <i className={`fas ${hasErrors ? 'fa-exclamation-triangle' : 'fa-check-circle'} me-2`} />
                                        {hasErrors ? 'Seed partiel' : 'Seed complet'}
                                    </div>
                                    <div className="card-body p-0">
                                        <table className="table table-sm table-striped mb-0">
                                            <thead>
                                                <tr>
                                                    <th className="ps-3">Entité</th>
                                                    <th className="pe-3 text-end">Créés</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(stats).map(([k, v]) => (
                                                    <tr key={k}>
                                                        <td className="ps-3 text-capitalize">{k.replace(/_/g, ' ')}</td>
                                                        <td className={`pe-3 text-end fw-semibold ${v === 0 ? 'text-danger' : ''}`}>{v}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-outline-secondary w-100 mt-3"
                                onClick={() => { setJobId(null); setJobStatus(null); setStats(null); setErrors({}); }}>
                                <i className="fas fa-redo me-2" />Nouveau seed
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeederInterface;
