import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Vrai si on est sur le domaine central (localhost pur ou domaine racine en prod)
// Faux si on est sur un sous-domaine tenant (lycee-test.localhost, ecole.mondomaine.ci…)
const estDomaineCentral = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

const LoginPage = () => {
    const { connexion, connexionGroupe } = useAuth();
    const navigate = useNavigate();

    const domaineCentral = estDomaineCentral();
    const [mode, setMode]         = useState(domaineCentral ? 'group' : 'school'); // 'school' | 'group'
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [afficher, setAfficher] = useState(false);
    const [erreur, setErreur]     = useState('');
    const [chargement, setChargement] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');
        setChargement(true);
        try {
            if (mode === 'group') {
                await connexionGroupe(email, password);
                navigate('/groupe');
            } else {
                await connexion(email, password);
                navigate('/');
            }
        } catch (err) {
            setErreur(err.response?.data?.message || 'Identifiants incorrects.');
        } finally {
            setChargement(false);
        }
    };

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

                    {/* Sélecteur de mode — uniquement sur les sous-domaines tenant */}
                    {!domaineCentral && (
                        <div className="d-flex mb-4" style={{
                            background: '#f1f5f9', borderRadius: 10, padding: 4,
                        }}>
                            <button
                                type="button"
                                onClick={() => { setMode('school'); setErreur(''); }}
                                style={{
                                    flex: 1, border: 'none', borderRadius: 8, padding: '8px 0',
                                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s',
                                    background: mode === 'school' ? '#fff' : 'transparent',
                                    color: mode === 'school' ? '#1a56a0' : '#6c757d',
                                    boxShadow: mode === 'school' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                                }}
                            >
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
                            <label className="form-label small fw-semibold">Adresse e-mail</label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-envelope text-muted" /></span>
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="exemple@etablissement.ci"
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
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
