import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useEtablissement } from '../../context/EtablissementContext';
import { useAuth } from '../../context/AuthContext';

const ANNEE_COURANTE = (() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const TYPES_TEMPLATES = [
    { type: 'lycee',         nom: 'Lycée',          description: 'Seconde / Première / Terminale — Séries A1, A2, B, C, D' },
    { type: 'lycee_complet', nom: 'Lycée Complet',  description: '6ème → Terminale (collège + lycée)' },
    { type: 'college',       nom: 'Collège',        description: '6ème / 5ème / 4ème / 3ème — BEPC' },
    { type: 'primaire',      nom: 'École Primaire', description: 'CP1 / CP2 / CE1 / CE2 / CM1 / CM2' },
];

const ParametresEtablissement = () => {
    const { toast } = useToast();
    const { rafraichir } = useEtablissement();
    const { estDansGroupe, groupeNom } = useAuth();

    // ── État démarrage rapide (établissements indépendants) ──
    const [templateType,  setTemplateType]  = useState('');
    const [anneeTemplate, setAnneeTemplate] = useState(ANNEE_COURANTE);
    const [periodesType,  setPeriodesType]  = useState('trimestre');
    const [appliqueEnCours, setAppliqueEnCours] = useState(false);
    const [resultatTemplate, setResultatTemplate] = useState(null);
    const [nbNiveaux, setNbNiveaux] = useState(null); // null = pas encore chargé

    const vide = {
        nom: '', slogan: '', adresse: '', ville: '', bp: '',
        telephone: '', telephone2: '', email: '', site_web: '', pays: '',
    };

    const [form, setForm]               = useState(vide);
    const [logoUrl, setLogoUrl]         = useState(null);
    const [chargement, setChargement]   = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);
    const [uploadLogo, setUploadLogo]   = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        const reqEtab    = api.get('/etablissement');
        const reqNiveaux = !estDansGroupe ? api.get('/niveaux') : Promise.resolve(null);

        Promise.all([reqEtab, reqNiveaux])
            .then(([rEtab, rNiveaux]) => {
                const d = rEtab.data;
                setForm({
                    nom:        d.nom        || '',
                    slogan:     d.slogan     || '',
                    adresse:    d.adresse    || '',
                    ville:      d.ville      || '',
                    bp:         d.bp         || '',
                    telephone:  d.telephone  || '',
                    telephone2: d.telephone2 || '',
                    email:      d.email      || '',
                    site_web:   d.site_web   || '',
                    pays:       d.pays       || '',
                });
                setLogoUrl(d.logo_url || null);
                if (rNiveaux) setNbNiveaux(rNiveaux.data.length);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les paramètres.'); setChargement(false); });
    }, [estDansGroupe]);

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const sauvegarder = () => {
        if (!form.nom.trim()) return;
        setEnregistrement(true);
        api.put('/etablissement', form)
            .then((r) => {
                setLogoUrl(r.data.logo_url || null);
                rafraichir(r.data);
                toast.success('Paramètres enregistrés.');
            })
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setEnregistrement(false));
    };

    const changerLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadLogo(true);
        const fd = new FormData();
        fd.append('logo', file);
        api.post('/etablissement/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((r) => { setLogoUrl(r.data.logo_url || null); rafraichir(r.data); toast.success('Logo mis à jour.'); })
            .catch(() => toast.error('Erreur lors de l\'upload du logo.'))
            .finally(() => setUploadLogo(false));
    };

    const appliquerTemplate = async (e) => {
        e.preventDefault();
        if (!templateType || !anneeTemplate) return;
        setAppliqueEnCours(true);
        setResultatTemplate(null);
        try {
            const r = await api.post('/self/apply-template', {
                type:          templateType,
                annee:         anneeTemplate,
                periodes_type: periodesType,
            });
            setResultatTemplate(r.data);
            setNbNiveaux(prev => (prev ?? 0) + (r.data.stats?.niveaux ?? 0));
            toast.success('Modèle appliqué avec succès !');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de l\'application du modèle.');
        } finally {
            setAppliqueEnCours(false);
        }
    };

    if (chargement) {
        return (
            <section className="page-wrapper">
                <div className="container-fluid text-center py-5">
                    <div className="spinner-border text-primary" />
                </div>
            </section>
        );
    }

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Paramètres de l'établissement</h4>
                </div>

                {/* ── Bandeau groupe ── */}
                {estDansGroupe && (
                    <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
                        <i className="fas fa-layer-group fa-lg" />
                        <div>
                            Cet établissement est membre du groupe <strong>{groupeNom}</strong>.
                            La configuration pédagogique (niveaux, matières, coefficients) est gérée
                            par l'administrateur du groupe.
                        </div>
                    </div>
                )}

                {/* ── Démarrage rapide (indépendants, école vide) ── */}
                {!estDansGroupe && nbNiveaux === 0 && (
                    <div className="card border-warning shadow-sm mb-4">
                        <div className="card-header bg-warning bg-opacity-10 fw-semibold d-flex align-items-center gap-2">
                            <i className="fas fa-magic text-warning" />
                            Démarrage rapide — Pré-remplir l'établissement
                        </div>
                        <div className="card-body">
                            <p className="text-muted small mb-3">
                                Votre établissement est vide. Sélectionnez un modèle pour créer
                                automatiquement les niveaux, matières, séries, coefficients et périodes.
                            </p>
                            <form onSubmit={appliquerTemplate}>
                                <div className="row g-2 mb-3">
                                    {TYPES_TEMPLATES.map(t => (
                                        <div key={t.type} className="col-md-6">
                                            <div
                                                className={`border rounded p-3 ${templateType === t.type ? 'border-warning bg-warning bg-opacity-10' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setTemplateType(t.type)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        className="form-check-input mt-0"
                                                        checked={templateType === t.type}
                                                        onChange={() => setTemplateType(t.type)}
                                                    />
                                                    <div>
                                                        <div className="fw-semibold small">{t.nom}</div>
                                                        <div className="text-muted" style={{ fontSize: 12 }}>{t.description}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-md-5">
                                        <label className="form-label small fw-semibold">Année scolaire</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={anneeTemplate}
                                            onChange={e => setAnneeTemplate(e.target.value)}
                                            pattern="\d{4}-\d{4}"
                                            placeholder="2024-2025"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-5">
                                        <label className="form-label small fw-semibold">Type de périodes</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={periodesType}
                                            onChange={e => setPeriodesType(e.target.value)}
                                        >
                                            <option value="trimestre">Trimestriel (T1 / T2 / T3)</option>
                                            <option value="semestre">Semestriel (S1 / S2)</option>
                                        </select>
                                    </div>
                                    <div className="col-md-2 d-flex align-items-end">
                                        <button
                                            type="submit"
                                            className="btn btn-warning btn-sm w-100"
                                            disabled={!templateType || appliqueEnCours}
                                        >
                                            {appliqueEnCours
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : <><i className="fas fa-magic me-1" />Appliquer</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {resultatTemplate && (
                                <div className="alert alert-success small mb-0">
                                    <i className="fas fa-check-circle me-2" />
                                    {Object.entries(resultatTemplate.stats)
                                        .filter(([, v]) => v > 0)
                                        .map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`)
                                        .join(' · ')
                                    } créés avec succès.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="row g-4">
                    {/* Logo */}
                    <div className="col-md-3 text-center">
                        <div
                            className="border rounded d-flex align-items-center justify-content-center bg-light mb-2"
                            style={{ height: 160, overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => fileRef.current?.click()}
                            title="Cliquer pour changer le logo"
                        >
                            {logoUrl
                                ? <img src={logoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                : <div className="text-muted text-center small">
                                    <i className="fas fa-image fa-2x mb-2 d-block" />
                                    Cliquer pour<br />ajouter un logo
                                  </div>
                            }
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={changerLogo} />
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploadLogo}
                        >
                            {uploadLogo
                                ? <><span className="spinner-border spinner-border-sm me-1" />Upload…</>
                                : <><i className="fas fa-upload me-1" />Changer le logo</>
                            }
                        </button>
                        <div className="text-muted small mt-1">JPG, PNG, SVG — max 2 Mo</div>
                    </div>

                    {/* Formulaire */}
                    <div className="col-md-9">
                        <div className="row g-3">
                            <div className="col-md-8">
                                <label className="form-label small fw-bold">Nom de l'établissement *</label>
                                <input
                                    type="text" name="nom"
                                    className="form-control form-control-sm"
                                    value={form.nom} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Pays</label>
                                <input
                                    type="text" name="pays"
                                    className="form-control form-control-sm"
                                    value={form.pays} onChange={handleChange}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold">Slogan</label>
                                <input
                                    type="text" name="slogan"
                                    className="form-control form-control-sm"
                                    placeholder="Ex : L'excellence au service de la jeunesse"
                                    value={form.slogan} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Adresse</label>
                                <input
                                    type="text" name="adresse"
                                    className="form-control form-control-sm"
                                    value={form.adresse} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Ville</label>
                                <input
                                    type="text" name="ville"
                                    className="form-control form-control-sm"
                                    value={form.ville} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold">Boîte postale</label>
                                <input
                                    type="text" name="bp"
                                    className="form-control form-control-sm"
                                    placeholder="BP 0000"
                                    value={form.bp} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Téléphone 1</label>
                                <input
                                    type="text" name="telephone"
                                    className="form-control form-control-sm"
                                    value={form.telephone} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Téléphone 2</label>
                                <input
                                    type="text" name="telephone2"
                                    className="form-control form-control-sm"
                                    value={form.telephone2} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Email</label>
                                <input
                                    type="email" name="email"
                                    className="form-control form-control-sm"
                                    value={form.email} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Site web</label>
                                <input
                                    type="text" name="site_web"
                                    className="form-control form-control-sm"
                                    placeholder="www.exemple.ci"
                                    value={form.site_web} onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={sauvegarder}
                                disabled={!form.nom.trim() || enregistrement}
                            >
                                {enregistrement
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>
                                    : <><i className="fas fa-save me-1" />Enregistrer</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ParametresEtablissement;
