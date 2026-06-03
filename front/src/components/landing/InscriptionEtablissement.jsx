import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const InscriptionEtablissement = () => {
    const [etape, setEtape]           = useState(0); // 0 = formulaire, 1 = succès
    const [chargement, setChargement] = useState(false);
    const [erreurs, setErreurs]       = useState({});
    const [erreurGlobal, setErreurGlobal] = useState('');

    const [form, setForm] = useState({
        nom_etablissement: '',
        type: '',
        code_ministere: '',
        ville: '',
        telephone: '',
        nom_responsable: '',
        email: '',
    });

    const set = (champ) => (e) => {
        setForm((f) => ({ ...f, [champ]: e.target.value }));
        setErreurs((er) => { const n = { ...er }; delete n[champ]; return n; });
    };

    const soumettre = async (e) => {
        e.preventDefault();
        setChargement(true);
        setErreurGlobal('');
        try {
            await axios.post(`${API_BASE}/demande-acces`, form);
            setEtape(1);
        } catch (err) {
            if (err.response?.status === 422) {
                const flat = {};
                Object.entries(err.response.data.errors ?? {}).forEach(([k, msgs]) => { flat[k] = msgs[0]; });
                setErreurs(flat);
            } else {
                setErreurGlobal(err.response?.data?.message ?? 'Une erreur est survenue. Veuillez réessayer.');
            }
        } finally {
            setChargement(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="text-center pt-4 pb-2">
                <Link to="/" className="text-white text-decoration-none d-inline-flex align-items-center gap-2 fw-bold fs-5">
                    <i className="fas fa-school" />Suivi Scolaire
                </Link>
            </div>

            <div className="container d-flex align-items-center justify-content-center flex-grow-1 py-4">
                <div style={{ width: '100%', maxWidth: 560 }}>

                    {etape === 0 && (
                        <>
                            <div className="text-center text-white mb-4">
                                <h3 className="fw-bold mb-1">Demander un accès</h3>
                                <p className="text-white-50 small">Remplissez ce formulaire — nous vous recontactons sous 24h.</p>
                            </div>

                            <div className="card shadow-lg" style={{ borderRadius: 16, border: 'none' }}>
                                <div className="card-body p-4 p-md-5">
                                    {erreurGlobal && (
                                        <div className="alert alert-danger py-2 small mb-4">
                                            <i className="fas fa-exclamation-circle me-2" />{erreurGlobal}
                                        </div>
                                    )}

                                    <form onSubmit={soumettre}>
                                        {/* ── Informations établissement ── */}
                                        <h6 className="fw-bold text-muted small text-uppercase mb-3 d-flex align-items-center gap-2">
                                            <i className="fas fa-school text-primary" />Votre établissement
                                        </h6>

                                        <div className="mb-3">
                                            <label className="form-label small fw-semibold">Nom de l'établissement <span className="text-danger">*</span></label>
                                            <input type="text" className={`form-control ${erreurs.nom_etablissement ? 'is-invalid' : ''}`}
                                                placeholder="Ex : Lycée Moderne de Cocody"
                                                value={form.nom_etablissement} onChange={set('nom_etablissement')} autoFocus />
                                            {erreurs.nom_etablissement && <div className="invalid-feedback">{erreurs.nom_etablissement}</div>}
                                        </div>

                                        <div className="row g-3 mb-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">Type d'établissement <span className="text-danger">*</span></label>
                                                <select className={`form-select ${erreurs.type ? 'is-invalid' : ''}`} value={form.type} onChange={set('type')}>
                                                    <option value="">— Sélectionner —</option>
                                                    <option value="college">Collège (6ème → 3ème)</option>
                                                    <option value="lycee">Lycée (Seconde → Terminale)</option>
                                                    <option value="lycee_complet">Lycée Complet (6ème → Terminale)</option>
                                                    <option value="primaire">École Primaire (CP1 → CM2)</option>
                                                </select>
                                                {erreurs.type && <div className="invalid-feedback">{erreurs.type}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">Code MENET <span className="text-danger">*</span></label>
                                                <input type="text" className={`form-control ${erreurs.code_ministere ? 'is-invalid' : ''}`}
                                                    placeholder="Ex : 0100123A"
                                                    value={form.code_ministere} onChange={set('code_ministere')} />
                                                {erreurs.code_ministere && <div className="invalid-feedback">{erreurs.code_ministere}</div>}
                                            </div>
                                        </div>

                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">Ville</label>
                                                <input type="text" className="form-control" placeholder="Ex : Abidjan"
                                                    value={form.ville} onChange={set('ville')} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold">Téléphone</label>
                                                <input type="tel" className="form-control" placeholder="07 00 00 00 00"
                                                    value={form.telephone} onChange={set('telephone')} />
                                            </div>
                                        </div>

                                        {/* ── Responsable ── */}
                                        <h6 className="fw-bold text-muted small text-uppercase mb-3 d-flex align-items-center gap-2">
                                            <i className="fas fa-user text-primary" />Responsable
                                        </h6>

                                        <div className="mb-3">
                                            <label className="form-label small fw-semibold">Nom complet <span className="text-danger">*</span></label>
                                            <input type="text" className={`form-control ${erreurs.nom_responsable ? 'is-invalid' : ''}`}
                                                placeholder="Ex : Koné Abou"
                                                value={form.nom_responsable} onChange={set('nom_responsable')} />
                                            {erreurs.nom_responsable && <div className="invalid-feedback">{erreurs.nom_responsable}</div>}
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label small fw-semibold">Adresse email <span className="text-danger">*</span></label>
                                            <input type="email" className={`form-control ${erreurs.email ? 'is-invalid' : ''}`}
                                                placeholder="votre@email.com"
                                                value={form.email} onChange={set('email')} />
                                            {erreurs.email && <div className="invalid-feedback">{erreurs.email}</div>}
                                        </div>

                                        <button type="submit" className="btn btn-primary w-100 fw-semibold"
                                            style={{ borderRadius: 8, padding: '12px 0' }} disabled={chargement}>
                                            {chargement
                                                ? <><span className="spinner-border spinner-border-sm me-2" />Envoi en cours…</>
                                                : <><i className="fas fa-paper-plane me-2" />Envoyer ma demande</>
                                            }
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <p className="text-center text-white-50 small mt-3">
                                Déjà un compte ? <Link to="/login" className="text-white">Se connecter</Link>
                            </p>
                        </>
                    )}

                    {etape === 1 && (
                        <div className="card shadow-lg text-center" style={{ borderRadius: 16, border: 'none' }}>
                            <div className="card-body p-4 p-md-5">
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <i className="fas fa-check text-success" style={{ fontSize: 32 }} />
                                </div>
                                <h4 className="fw-bold mb-2" style={{ color: '#0d3b73' }}>Demande reçue !</h4>
                                <p className="text-muted mb-4">
                                    Nous avons bien reçu votre demande pour <strong>{form.nom_etablissement}</strong>.<br />
                                    Vous recevrez vos accès par email sous <strong>24 heures</strong>.
                                </p>
                                <div className="alert alert-info text-start small mb-4">
                                    <i className="fas fa-info-circle me-2" />
                                    Vérifiez votre boîte <strong>{form.email}</strong> (y compris les spams).
                                    Notre équipe vous contactera également par téléphone si nécessaire.
                                </div>
                                <Link to="/" className="btn btn-outline-primary w-100" style={{ borderRadius: 8 }}>
                                    Retour à l'accueil
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InscriptionEtablissement;
