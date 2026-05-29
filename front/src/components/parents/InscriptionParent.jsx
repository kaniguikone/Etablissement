import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const InscriptionParent = () => {
    const [etape, setEtape]       = useState(1); // 1: matricule | 2: infos | 3: succès
    const [matricule, setMatricule] = useState('');
    const [eleve, setEleve]       = useState(null);
    const [errMatricule, setErrMatricule] = useState('');
    const [verifEnCours, setVerifEnCours] = useState(false);

    const [form, setForm] = useState({
        nom_parent: '', prenom_parent: '', numero_parent: '',
        password: '', relation: '',
    });
    const [erreurs, setErreurs]   = useState({});
    const [chargement, setChargement] = useState(false);
    const [resultat, setResultat] = useState(null); // { statut, message }

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const verifierMatricule = async (e) => {
        e.preventDefault();
        setErrMatricule('');
        setVerifEnCours(true);
        try {
            const { data } = await api.get(`/mobile/parent/valider-matricule/${matricule.trim()}`);
            setEleve(data.eleve);
            setEtape(2);
        } catch (err) {
            setErrMatricule(err.response?.data?.message || 'Matricule introuvable.');
        } finally {
            setVerifEnCours(false);
        }
    };

    const soumettre = async (e) => {
        e.preventDefault();
        setErreurs({});
        setChargement(true);
        try {
            const { data } = await api.post('/mobile/parent/register', {
                ...form,
                matricule_eleve: matricule.trim(),
            });
            setResultat({ statut: data.statut, message: data.message });
            setEtape(3);
        } catch (err) {
            if (err.response?.status === 422) {
                setErreurs(err.response.data.errors || {});
            } else {
                setErreurs({ general: err.response?.data?.message || 'Une erreur est survenue.' });
            }
        } finally {
            setChargement(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)', padding: '2rem' }}>
            <div className="card shadow-lg" style={{ width: '100%', maxWidth: 480, borderRadius: 16 }}>
                <div className="card-body p-4 p-md-5">

                    {/* En-tête */}
                    <div className="text-center mb-4">
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a56a0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <i className="fas fa-user-friends text-white" style={{ fontSize: 22 }} />
                        </div>
                        <h5 className="fw-bold mb-1">Portail Parent</h5>
                        <p className="text-muted small mb-0">Créez votre compte pour suivre la scolarité de votre enfant</p>
                    </div>

                    {/* Indicateur d'étapes */}
                    {etape < 3 && (
                        <div className="d-flex justify-content-center gap-2 mb-4">
                            {[1, 2].map(n => (
                                <div key={n} style={{
                                    width: 32, height: 32, borderRadius: '50%', fontSize: 13, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: etape >= n ? '#1a56a0' : '#e9ecef',
                                    color: etape >= n ? '#fff' : '#6c757d',
                                }}>{n}</div>
                            ))}
                        </div>
                    )}

                    {/* Étape 1 — Matricule */}
                    {etape === 1 && (
                        <form onSubmit={verifierMatricule}>
                            <p className="text-center text-muted small mb-3">
                                Saisissez le matricule de votre enfant (indiqué sur son bulletin ou sa carte scolaire).
                            </p>
                            {errMatricule && (
                                <div className="alert alert-danger py-2 small">{errMatricule}</div>
                            )}
                            <div className="mb-3">
                                <label className="form-label fw-semibold small">Matricule de l'élève</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ex : LY-2024-0123"
                                    value={matricule}
                                    onChange={e => setMatricule(e.target.value)}
                                    required autoFocus
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={verifEnCours} style={{ borderRadius: 8 }}>
                                {verifEnCours ? <><span className="spinner-border spinner-border-sm me-2" />Vérification...</> : 'Continuer'}
                            </button>
                            <p className="text-center mt-3 mb-0 small">
                                Déjà inscrit ? <Link to="/login">Se connecter</Link>
                            </p>
                        </form>
                    )}

                    {/* Étape 2 — Infos parent */}
                    {etape === 2 && eleve && (
                        <form onSubmit={soumettre}>
                            {/* Récap élève */}
                            <div className="alert alert-info py-2 small mb-3">
                                <i className="fas fa-user-graduate me-2" />
                                <strong>{eleve.nom} {eleve.prenoms}</strong> — {eleve.classe} {eleve.niveau && `(${eleve.niveau})`}
                            </div>

                            {erreurs.general && <div className="alert alert-danger py-2 small">{erreurs.general}</div>}

                            <div className="row g-2 mb-2">
                                <div className="col-6">
                                    <label className="form-label fw-semibold small">Nom</label>
                                    <input type="text" name="nom_parent" className={`form-control ${erreurs.nom_parent ? 'is-invalid' : ''}`}
                                        value={form.nom_parent} onChange={handleChange} required />
                                    {erreurs.nom_parent && <div className="invalid-feedback">{erreurs.nom_parent[0]}</div>}
                                </div>
                                <div className="col-6">
                                    <label className="form-label fw-semibold small">Prénom</label>
                                    <input type="text" name="prenom_parent" className={`form-control ${erreurs.prenom_parent ? 'is-invalid' : ''}`}
                                        value={form.prenom_parent} onChange={handleChange} required />
                                    {erreurs.prenom_parent && <div className="invalid-feedback">{erreurs.prenom_parent[0]}</div>}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="form-label fw-semibold small">Numéro de téléphone</label>
                                <input type="tel" name="numero_parent" className={`form-control ${erreurs.numero_parent ? 'is-invalid' : ''}`}
                                    placeholder="ex : 0701234567" value={form.numero_parent} onChange={handleChange} required />
                                {erreurs.numero_parent && <div className="invalid-feedback">{erreurs.numero_parent[0]}</div>}
                            </div>

                            <div className="mb-2">
                                <label className="form-label fw-semibold small">Mot de passe</label>
                                <input type="password" name="password" className={`form-control ${erreurs.password ? 'is-invalid' : ''}`}
                                    placeholder="Minimum 6 caractères" value={form.password} onChange={handleChange} required minLength={6} />
                                {erreurs.password && <div className="invalid-feedback">{erreurs.password[0]}</div>}
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-semibold small">Lien avec l'élève</label>
                                <select name="relation" className="form-select" value={form.relation} onChange={handleChange}>
                                    <option value="">-- Choisir --</option>
                                    <option value="Père">Père</option>
                                    <option value="Mère">Mère</option>
                                    <option value="Tuteur">Tuteur</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>

                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-outline-secondary flex-shrink-0" onClick={() => setEtape(1)}>
                                    <i className="fas fa-arrow-left" />
                                </button>
                                <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={chargement} style={{ borderRadius: 8 }}>
                                    {chargement ? <><span className="spinner-border spinner-border-sm me-2" />Inscription...</> : "S'inscrire"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Étape 3 — Résultat */}
                    {etape === 3 && resultat && (
                        <div className="text-center">
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: resultat.statut === 'actif' ? '#198754' : '#fd7e14', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <i className={`fas ${resultat.statut === 'actif' ? 'fa-check' : 'fa-clock'} text-white`} style={{ fontSize: 26 }} />
                            </div>
                            <h5 className="fw-bold mb-2">{resultat.statut === 'actif' ? 'Compte activé !' : 'Inscription reçue'}</h5>
                            <p className="text-muted small">{resultat.message}</p>
                            {resultat.statut === 'actif' && (
                                <Link to="/login" className="btn btn-primary w-100 mt-2 fw-semibold" style={{ borderRadius: 8 }}>
                                    Se connecter
                                </Link>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default InscriptionParent;
