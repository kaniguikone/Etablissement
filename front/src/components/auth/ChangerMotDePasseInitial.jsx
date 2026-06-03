import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const ChangerMotDePasseInitial = () => {
    const { user, token, mettreAJourSession } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword]     = useState('');
    const [confirm, setConfirm]       = useState('');
    const [afficher, setAfficher]     = useState(false);
    const [chargement, setChargement] = useState(false);
    const [erreur, setErreur]         = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            setErreur('Les mots de passe ne correspondent pas.');
            return;
        }
        if (password.length < 6) {
            setErreur('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        setErreur('');
        setChargement(true);
        try {
            await api.post('/changer-mot-de-passe-initial', {
                password,
                password_confirmation: confirm,
            });
            // Mettre à jour le flag dans le contexte + localStorage
            const userMaj = { ...user, must_change_password: false };
            mettreAJourSession(token, userMaj);
            navigate('/accueil', { replace: true });
        } catch (err) {
            setErreur(err.response?.data?.message || 'Une erreur est survenue.');
        } finally {
            setChargement(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)',
        }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 440, borderRadius: 16, border: 'none' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: '#f59e0b',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        }}>
                            <i className="fas fa-key text-white" style={{ fontSize: 26 }} />
                        </div>
                        <h5 className="fw-bold mb-1">Changement de mot de passe requis</h5>
                        <p className="text-muted small mb-0">
                            Pour la sécurité de votre compte, veuillez définir un nouveau mot de passe avant de continuer.
                        </p>
                    </div>

                    <div className="alert alert-warning py-2 small mb-4">
                        <i className="fas fa-info-circle me-2" />
                        Vous êtes connecté avec un mot de passe temporaire. Ce changement est obligatoire.
                    </div>

                    {erreur && (
                        <div className="alert alert-danger py-2 small">
                            <i className="fas fa-exclamation-circle me-2" />{erreur}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label small fw-semibold">Nouveau mot de passe</label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
                                <input
                                    type={afficher ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="Minimum 6 caractères"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required autoFocus
                                />
                                <button type="button" className="input-group-text"
                                    onClick={() => setAfficher(v => !v)} tabIndex={-1}>
                                    <i className={`fas ${afficher ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label small fw-semibold">Confirmer le mot de passe</label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
                                <input
                                    type={afficher ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="Répétez le mot de passe"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-warning w-100 fw-semibold text-white"
                            style={{ borderRadius: 8, padding: '10px 0' }} disabled={chargement}>
                            {chargement
                                ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                : <><i className="fas fa-check me-2" />Définir mon mot de passe</>
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangerMotDePasseInitial;
