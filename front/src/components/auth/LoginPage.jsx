import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
    const { connexion } = useAuth();
    const navigate = useNavigate();

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
            await connexion(email, password);
            navigate('/');
        } catch (err) {
            setErreur(err.response?.data?.message || 'Erreur de connexion.');
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
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 420, borderRadius: 16 }}>
                <div className="card-body p-5">

                    {/* En-tête */}
                    <div className="text-center mb-4">
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: '#1a56a0', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        }}>
                            <i className="fas fa-school text-white" style={{ fontSize: 28 }} />
                        </div>
                        <h4 className="fw-bold mb-1">Suivi Scolaire</h4>
                        <p className="text-muted small">Espace Administration</p>
                    </div>

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
