import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

const ReinitialisationMotDePasse = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const token = params.get('token') ?? '';
    const email = params.get('email') ?? '';

    const [password, setPassword]       = useState('');
    const [confirmation, setConf]       = useState('');
    const [afficher, setAfficher]       = useState(false);
    const [chargement, setChargement]   = useState(false);
    const [erreur, setErreur]           = useState('');
    const [succes, setSucces]           = useState(false);

    const soumettre = async (e) => {
        e.preventDefault();
        if (password !== confirmation) { setErreur('Les mots de passe ne correspondent pas.'); return; }
        setChargement(true);
        setErreur('');
        try {
            await api.post('/mot-de-passe/reinitialiser', {
                email,
                token,
                password,
                password_confirmation: confirmation,
            });
            setSucces(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setErreur(err.response?.data?.message ?? 'Lien invalide ou expiré. Veuillez refaire une demande.');
        } finally {
            setChargement(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)' }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 420, borderRadius: 16 }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a56a0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <i className="fas fa-key text-white" style={{ fontSize: 22 }} />
                        </div>
                        <h5 className="fw-bold mb-1">Nouveau mot de passe</h5>
                    </div>

                    {succes ? (
                        <div className="text-center">
                            <div className="alert alert-success">
                                <i className="fas fa-check-circle me-2" />
                                Mot de passe modifié ! Redirection en cours…
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={soumettre}>
                            {(!token || !email) && (
                                <div className="alert alert-danger small">Lien invalide. Veuillez refaire une demande depuis la page de connexion.</div>
                            )}
                            {erreur && <div className="alert alert-danger py-2 small">{erreur}</div>}

                            <div className="mb-3">
                                <label className="form-label small fw-semibold">Nouveau mot de passe</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
                                    <input
                                        type={afficher ? 'text' : 'password'}
                                        className="form-control"
                                        placeholder="Minimum 8 caractères"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required minLength={8} autoFocus
                                    />
                                    <button type="button" className="input-group-text" onClick={() => setAfficher(!afficher)} tabIndex={-1}>
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
                                        value={confirmation}
                                        onChange={e => setConf(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={chargement || !token || !email} style={{ borderRadius: 8 }}>
                                {chargement ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</> : 'Enregistrer le nouveau mot de passe'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReinitialisationMotDePasse;
