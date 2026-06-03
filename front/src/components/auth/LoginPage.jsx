import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

// Vrai si on est sur le domaine central (localhost pur ou domaine racine en prod)
// Faux si on est sur un sous-domaine tenant (lycee-test.localhost, ecole.mondomaine.ci…)
const estDomaineCentral = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

const LoginPage = () => {
    const { connexion, connexionEnseignant, connexionGroupe, connexionSuperAdmin } = useAuth();
    const navigate = useNavigate();

    const domaineCentral = estDomaineCentral();
    const [mode, setMode]         = useState(domaineCentral ? 'group' : 'school'); // 'school' | 'group'
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [afficher, setAfficher] = useState(false);
    const [erreur, setErreur]     = useState('');
    const [chargement, setChargement] = useState(false);

    // Mot de passe oublié
    const [vueMdp, setVueMdp]         = useState('login'); // 'login' | 'oublie' | 'confirme'
    const [emailOublie, setEmailOublie] = useState('');
    const [envoiMdp, setEnvoiMdp]     = useState(false);
    const [erreurMdp, setErreurMdp]   = useState('');

    const envoyerLienReinit = async (e) => {
        e.preventDefault();
        setEnvoiMdp(true);
        setErreurMdp('');
        try {
            await api.post('/mot-de-passe/oublie', { email: emailOublie });
            setVueMdp('confirme');
        } catch {
            setErreurMdp('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setEnvoiMdp(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');
        setChargement(true);
        try {
            if (mode === 'group') {
                await connexionGroupe(email, password);
                navigate('/groupe');
            } else if (!email.includes('@')) {
                await connexionEnseignant(email, password);
                navigate('/enseignant');
            } else {
                await connexion(email, password);
                navigate('/accueil');
            }
        } catch (err) {
            setErreur(err.response?.data?.message || 'Identifiants incorrects.');
        } finally {
            setChargement(false);
        }
    };

    // ── Vue : mot de passe oublié ──────────────────────────────────────────
    if (vueMdp === 'oublie' || vueMdp === 'confirme') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)' }}>
                <div className="card shadow-lg" style={{ width: '100%', maxWidth: 420, borderRadius: 16 }}>
                    <div className="card-body p-5">
                        <div className="text-center mb-4">
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a56a0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <i className={`fas ${vueMdp === 'confirme' ? 'fa-envelope-open-text' : 'fa-key'} text-white`} style={{ fontSize: 22 }} />
                            </div>
                            <h5 className="fw-bold mb-1">{vueMdp === 'confirme' ? 'Email envoyé !' : 'Mot de passe oublié'}</h5>
                        </div>

                        {vueMdp === 'confirme' ? (
                            <>
                                <p className="text-muted small text-center">
                                    Si l'adresse <strong>{emailOublie}</strong> est associée à un compte, vous recevrez un email avec un lien de réinitialisation valable 60 minutes.
                                </p>
                                <p className="text-muted small text-center mt-2">Vérifiez vos spams si vous ne trouvez pas l'email.</p>
                                <button className="btn btn-outline-secondary w-100 mt-3" onClick={() => { setVueMdp('login'); setEmailOublie(''); }}>
                                    <i className="fas fa-arrow-left me-2" />Retour à la connexion
                                </button>
                            </>
                        ) : (
                            <form onSubmit={envoyerLienReinit}>
                                {erreurMdp && <div className="alert alert-danger py-2 small">{erreurMdp}</div>}
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Adresse email du compte</label>
                                    <input type="email" className="form-control" placeholder="exemple@etablissement.ci"
                                        value={emailOublie} onChange={e => setEmailOublie(e.target.value)} required autoFocus />
                                </div>
                                <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={envoiMdp} style={{ borderRadius: 8 }}>
                                    {envoiMdp ? <><span className="spinner-border spinner-border-sm me-2" />Envoi…</> : 'Envoyer le lien'}
                                </button>
                                <button type="button" className="btn btn-link w-100 small mt-2" onClick={() => setVueMdp('login')}>
                                    Retour à la connexion
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)',
        }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 440, borderRadius: 16 }}>
                <div className="card-body p-5">

                    {/* En-tête */}
                    <div className="text-center mb-4">
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: '#1a56a0', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        }}>
                            <i className={`fas ${mode === 'group' ? 'fa-layer-group' : 'fa-school'} text-white`} style={{ fontSize: 26 }} />
                        </div>
                        <h4 className="fw-bold mb-1">Suivi Scolaire</h4>
                        <p className="text-muted small">
                            {domaineCentral ? 'Espace Groupe Scolaire' : 'Espace Administration'}
                        </p>
                    </div>

                    {/* Sur le domaine central : onglet Groupe scolaire uniquement */}
                    {domaineCentral && (
                        <div className="d-flex mb-4" style={{ background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
                            <button type="button" style={{
                                flex: 1, border: 'none', borderRadius: 8, padding: '8px 0',
                                fontWeight: 600, fontSize: 13, cursor: 'default',
                                background: '#fff', color: '#1a56a0',
                                boxShadow: '0 1px 4px rgba(0,0,0,.1)',
                            }}>
                                <i className="fas fa-layer-group me-2" />Groupe scolaire
                            </button>
                        </div>
                    )}

                    {/* Sélecteur de mode — sous-domaine tenant : Établissement uniquement */}
                    {!domaineCentral && (
                        <div className="d-flex mb-4" style={{ background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
                            <button type="button" onClick={() => { setMode('school'); setErreur(''); }}
                                style={{
                                    flex: 1, border: 'none', borderRadius: 8, padding: '8px 0',
                                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                    background: '#fff', color: '#1a56a0',
                                    boxShadow: '0 1px 4px rgba(0,0,0,.1)',
                                }}>
                                <i className="fas fa-school me-2" />Établissement
                            </button>
                        </div>
                    )}

                    {erreur && (
                        <div className="alert alert-danger py-2 small">
                            <i className="fas fa-exclamation-circle me-2" />
                            {erreur}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">
                                {domaineCentral ? 'Adresse e-mail' : 'Email ou numéro enseignant'}
                            </label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-envelope text-muted" /></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={domaineCentral ? 'exemple@etablissement.ci' : 'Email ou numéro enseignant'}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label small fw-semibold">Mot de passe</label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
                                <input
                                    type={afficher ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="input-group-text"
                                    onClick={() => setAfficher(!afficher)}
                                    tabIndex={-1}
                                >
                                    <i className={`fas ${afficher ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100 fw-semibold"
                            disabled={chargement}
                            style={{ borderRadius: 8, padding: '10px 0' }}
                        >
                            {chargement
                                ? <><span className="spinner-border spinner-border-sm me-2" />Connexion…</>
                                : 'Se connecter'
                            }
                        </button>
                        {!domaineCentral && (
                            <div className="text-center mt-3">
                                <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                                    onClick={() => { setVueMdp('oublie'); setEmailOublie(email); setErreurMdp(''); }}>
                                    Mot de passe oublié ?
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
