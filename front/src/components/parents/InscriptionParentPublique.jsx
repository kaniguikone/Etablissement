import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { centralApi } from '../../api/axios';

const RELATION_OPTIONS = ['Père', 'Mère', 'Tuteur', 'Autre'];

const InscriptionParentPublique = () => {
    const [etape, setEtape]           = useState(1); // 1 | 2 | 3
    const [tarif, setTarif]           = useState(null);

    // Étape 1
    const [codeMenet, setCodeMenet]   = useState('');
    const [matricule, setMatricule]   = useState('');
    const [verifEnCours, setVerif]    = useState(false);
    const [errEtape1, setErrEtape1]   = useState('');
    const [eleveTrouve, setEleveTrouve] = useState(null); // { eleve, etablissement, tenant_id }

    // Étape 2
    const [form, setForm]             = useState({ nom: '', prenom: '', telephone: '', password: '', relation: '' });
    const [afficherMdp, setAffMdp]    = useState(false);
    const [envoi, setEnvoi]           = useState(false);
    const [errEtape2, setErrEtape2]   = useState('');

    // Étape 3
    const [messageSucces, setMsg]     = useState('');

    useEffect(() => {
        centralApi.get('/tarifs')
            .then(r => setTarif(r.data.config?.tarif_acces_parent))
            .catch(() => {});
    }, []);

    const set = (champ) => (e) => setForm(f => ({ ...f, [champ]: e.target.value }));

    // ── Étape 1 : vérifier code MENET + matricule ────────────────────────────
    const verifier = async (e) => {
        e.preventDefault();
        setErrEtape1('');
        setVerif(true);
        try {
            const { data } = await centralApi.get('/parent/valider-matricule', {
                params: { code_menet: codeMenet.trim(), matricule: matricule.trim() },
            });
            setEleveTrouve(data);
            setEtape(2);
        } catch (err) {
            setErrEtape1(err.response?.data?.message || 'Une erreur est survenue.');
        } finally {
            setVerif(false);
        }
    };

    // ── Étape 2 : créer le compte ────────────────────────────────────────────
    const inscrire = async (e) => {
        e.preventDefault();
        if (form.password.length < 6) {
            setErrEtape2('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        setErrEtape2('');
        setEnvoi(true);
        try {
            const { data } = await centralApi.post('/parent/inscription', {
                tenant_id:       eleveTrouve.tenant_id,
                matricule_eleve: matricule.trim(),
                nom_parent:      form.nom.trim(),
                prenom_parent:   form.prenom.trim(),
                numero_parent:   form.telephone.trim(),
                password:        form.password,
                relation:        form.relation || null,
            });
            setMsg(data.message);
            setEtape(3);
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const first = Object.values(errors)[0];
                setErrEtape2(Array.isArray(first) ? first[0] : first);
            } else {
                setErrEtape2(err.response?.data?.message || 'Une erreur est survenue.');
            }
        } finally {
            setEnvoi(false);
        }
    };

    const indicateur = () => (
        <div className="d-flex align-items-center justify-content-center gap-2 mb-4">
            {[1, 2].map(n => (
                <div key={n} className="d-flex align-items-center gap-2">
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
                        background: etape >= n ? '#1a56a0' : '#e2e8f0',
                        color: etape >= n ? '#fff' : '#64748b',
                    }}>{n}</div>
                    {n < 2 && <div style={{ width: 40, height: 2, background: etape > n ? '#1a56a0' : '#e2e8f0' }} />}
                </div>
            ))}
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)', padding: '24px 16px',
        }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 480, borderRadius: 16, border: 'none' }}>
                <div className="card-body p-4 p-md-5">

                    {/* En-tête */}
                    <div className="text-center mb-4">
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%', background: '#1a56a0',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        }}>
                            <i className="fas fa-user-friends text-white" style={{ fontSize: 24 }} />
                        </div>
                        <h5 className="fw-bold mb-1">Espace Parents</h5>
                        <p className="text-muted small mb-0">Créez votre compte pour suivre la scolarité de votre enfant</p>
                        {tarif && (
                            <span className="badge bg-success mt-2" style={{ fontSize: 13 }}>
                                {Number(tarif).toLocaleString('fr-FR')} FCFA / an
                            </span>
                        )}
                    </div>

                    {/* ── Étape 1 ── */}
                    {etape === 1 && (
                        <form onSubmit={verifier}>
                            {indicateur()}

                            <h6 className="fw-semibold mb-1">Identifiez l'établissement de votre enfant</h6>
                            <p className="text-muted small mb-3">Renseignez le code MENET de l'école et le matricule indiqué sur le bulletin.</p>

                            {errEtape1 && (
                                <div className="alert alert-danger py-2 small">
                                    <i className="fas fa-exclamation-circle me-2" />{errEtape1}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label small fw-semibold">Code MENET de l'établissement</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-school text-muted" /></span>
                                    <input type="text" className="form-control text-uppercase"
                                        placeholder="ex : 0501A0001B"
                                        value={codeMenet}
                                        onChange={e => setCodeMenet(e.target.value.toUpperCase())}
                                        required autoFocus />
                                </div>
                                <div className="form-text">Ce code figure sur les documents officiels de l'école.</div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-semibold">Matricule de votre enfant</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-id-card text-muted" /></span>
                                    <input type="text" className="form-control text-uppercase"
                                        placeholder="ex : LY-2024-0123"
                                        value={matricule}
                                        onChange={e => setMatricule(e.target.value.toUpperCase())}
                                        required />
                                </div>
                                <div className="form-text">Le matricule est indiqué sur le bulletin scolaire.</div>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 fw-semibold"
                                style={{ borderRadius: 8, padding: '10px 0' }} disabled={verifEnCours}>
                                {verifEnCours
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Vérification…</>
                                    : <><i className="fas fa-arrow-right me-2" />Continuer</>
                                }
                            </button>
                        </form>
                    )}

                    {/* ── Étape 2 ── */}
                    {etape === 2 && (
                        <form onSubmit={inscrire}>
                            {indicateur()}

                            {/* Récap élève */}
                            {eleveTrouve && (
                                <div className="d-flex align-items-start gap-2 p-3 rounded-3 mb-3"
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                    <i className="fas fa-graduation-cap text-primary mt-1" />
                                    <div className="small">
                                        <div className="fw-semibold">
                                            {eleveTrouve.eleve.nom} {eleveTrouve.eleve.prenoms}
                                        </div>
                                        <div className="text-muted">
                                            {eleveTrouve.eleve.classe}{eleveTrouve.eleve.niveau ? ` — ${eleveTrouve.eleve.niveau}` : ''}
                                        </div>
                                        <div className="text-muted">{eleveTrouve.etablissement}</div>
                                    </div>
                                </div>
                            )}

                            <h6 className="fw-semibold mb-3">Vos informations</h6>

                            {errEtape2 && (
                                <div className="alert alert-danger py-2 small">
                                    <i className="fas fa-exclamation-circle me-2" />{errEtape2}
                                </div>
                            )}

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label small fw-semibold">Nom</label>
                                    <input type="text" className="form-control" value={form.nom}
                                        onChange={set('nom')} required autoFocus />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-semibold">Prénom</label>
                                    <input type="text" className="form-control" value={form.prenom}
                                        onChange={set('prenom')} required />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-semibold">Numéro de téléphone</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-phone text-muted" /></span>
                                    <input type="tel" className="form-control" placeholder="0701234567"
                                        value={form.telephone} onChange={set('telephone')} required />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-semibold">Mot de passe</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
                                    <input type={afficherMdp ? 'text' : 'password'} className="form-control"
                                        placeholder="Minimum 6 caractères"
                                        value={form.password} onChange={set('password')} required />
                                    <button type="button" className="input-group-text"
                                        onClick={() => setAffMdp(v => !v)} tabIndex={-1}>
                                        <i className={`fas ${afficherMdp ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-semibold">Lien avec l'élève</label>
                                <select className="form-select" value={form.relation} onChange={set('relation')}>
                                    <option value="">— Sélectionnez —</option>
                                    {RELATION_OPTIONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-outline-secondary"
                                    style={{ borderRadius: 8 }} onClick={() => setEtape(1)}>
                                    <i className="fas fa-arrow-left" />
                                </button>
                                <button type="submit" className="btn btn-primary flex-fill fw-semibold"
                                    style={{ borderRadius: 8, padding: '10px 0' }} disabled={envoi}>
                                    {envoi
                                        ? <><span className="spinner-border spinner-border-sm me-2" />Inscription…</>
                                        : <><i className="fas fa-check me-2" />S'inscrire</>
                                    }
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── Étape 3 : succès ── */}
                    {etape === 3 && (
                        <div className="text-center py-2">
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', background: '#22c55e',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                            }}>
                                <i className="fas fa-check text-white" style={{ fontSize: 30 }} />
                            </div>
                            <h5 className="fw-bold mb-2">Compte créé !</h5>
                            <p className="text-muted small mb-4" style={{ lineHeight: 1.6 }}>
                                {messageSucces}
                            </p>

                            {/* Instructions de paiement */}
                            <div className="p-3 rounded-3 text-start mb-4"
                                style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                                <div className="fw-semibold small mb-2">
                                    <i className="fas fa-info-circle text-warning me-2" />Activation de votre accès
                                </div>
                                <ul className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.8 }}>
                                    <li>Téléchargez l'application <strong>Suivi Scolaire</strong></li>
                                    <li>Présentez-vous à l'établissement avec votre téléphone</li>
                                    {tarif && <li>Réglez les frais d'accès : <strong>{Number(tarif).toLocaleString('fr-FR')} FCFA</strong></li>}
                                    <li>L'école activera votre compte dans les 24h</li>
                                </ul>
                            </div>

                            <Link to="/" className="btn btn-primary w-100 fw-semibold" style={{ borderRadius: 8 }}>
                                <i className="fas fa-home me-2" />Retour à l'accueil
                            </Link>
                        </div>
                    )}

                    {/* Lien retour */}
                    {etape < 3 && (
                        <div className="text-center mt-3">
                            <Link to="/" className="text-muted small">
                                <i className="fas fa-arrow-left me-1" />Retour à l'accueil
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InscriptionParentPublique;
