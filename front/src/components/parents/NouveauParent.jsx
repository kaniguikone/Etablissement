import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouveauParent = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [form, setForm]       = useState({
        numero_parent: '', nom_parent: '', prenom_parent: '', password: '12345',
        email_parent: '', adresse_parent: '', relation_parent: '', profession_parent: '',
    });

    // Gestion des matricules : liste de champs dynamiques
    const [matricules, setMatricules]         = useState(['']);
    const [elevesVerifies, setElevesVerifies] = useState({});   // { matricule: eleveObj | null }
    const [verifying, setVerifying]           = useState({});

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    // Modifier un matricule dans la liste
    const handleMatriculeChange = (i, val) => {
        const updated = [...matricules];
        updated[i] = val;
        setMatricules(updated);
        // Réinitialiser la vérification si l'utilisateur retape
        setElevesVerifies((prev) => { const n = { ...prev }; delete n[val]; return n; });
    };

    // Vérifier un matricule via l'API
    const verifierMatricule = async (i) => {
        const mat = matricules[i].trim();
        if (!mat) return;
        setVerifying((prev) => ({ ...prev, [i]: true }));
        try {
            const res = await api.get('/elevesTout');
            const eleve = res.data.find(
                (e) => e.matricule_eleve.toLowerCase() === mat.toLowerCase()
            );
            if (eleve && eleve.parent_id) {
                // Élève déjà rattaché à un autre parent
                setElevesVerifies((prev) => ({ ...prev, [mat]: { ...eleve, dejaRattache: true } }));
            } else {
                setElevesVerifies((prev) => ({ ...prev, [mat]: eleve || null }));
            }
        } catch {
            setElevesVerifies((prev) => ({ ...prev, [mat]: null }));
        } finally {
            setVerifying((prev) => ({ ...prev, [i]: false }));
        }
    };

    const ajouterMatricule = () => setMatricules([...matricules, '']);

    const supprimerMatricule = (i) => {
        const updated = matricules.filter((_, idx) => idx !== i);
        setMatricules(updated.length ? updated : ['']);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const matriculesFiltres = matricules.map((m) => m.trim()).filter(Boolean);

        api.post('/parents', { ...form, matricules: matriculesFiltres })
            .then(() => { toast.success('Parent enregistré avec succès.'); navigate('/Parents'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                }
            });
    };

    return (
        <section className="content content-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouveau parent</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        {/* Informations du parent */}
                        <div className="col-md-4">
                            <label className="form-label">Nom</label>
                            <input type="text" className="form-control form-control-sm" name="nom_parent"
                                value={form.nom_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Prénom</label>
                            <input type="text" className="form-control form-control-sm" name="prenom_parent"
                                value={form.prenom_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Numéro de téléphone *</label>
                            <input type="text" className="form-control form-control-sm" name="numero_parent"
                                value={form.numero_parent} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Mot de passe</label>
                            <input type="text" className="form-control form-control-sm" name="password"
                                value={form.password} onChange={handleChange} />
                            <div className="form-text">Par défaut : 12345</div>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Relation avec l'élève</label>
                            <select className="form-select form-select-sm" name="relation_parent" value={form.relation_parent} onChange={handleChange}>
                                <option value="">Sélectionner</option>
                                <option value="Père">Père</option>
                                <option value="Mère">Mère</option>
                                <option value="Tuteur">Tuteur</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control form-control-sm" name="email_parent"
                                value={form.email_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Profession</label>
                            <input type="text" className="form-control form-control-sm" name="profession_parent"
                                value={form.profession_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-8">
                            <label className="form-label">Adresse</label>
                            <input type="text" className="form-control form-control-sm" name="adresse_parent"
                                value={form.adresse_parent} onChange={handleChange} />
                        </div>

                        {/* Sélection des élèves par matricule */}
                        <div className="col-12 mt-3">
                            <label className="form-label fw-bold">Élèves à rattacher (par matricule)</label>
                            {matricules.map((mat, i) => {
                                const info = elevesVerifies[mat.trim()];
                                return (
                                    <div key={i} className="d-flex align-items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm ${
                                                mat.trim() && info !== undefined
                                                    ? info ? 'is-valid' : 'is-invalid'
                                                    : ''
                                            }`}
                                            placeholder="Matricule élève"
                                            value={mat}
                                            onChange={(e) => handleMatriculeChange(i, e.target.value)}
                                            style={{ maxWidth: '200px' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => verifierMatricule(i)}
                                            disabled={!mat.trim() || verifying[i]}
                                        >
                                            {verifying[i]
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : 'Vérifier'}
                                        </button>
                                        {info && !info.dejaRattache && (
                                            <span className="text-success small">
                                                ✓ {info.nom_eleve} {info.prenoms_eleve}
                                            </span>
                                        )}
                                        {info?.dejaRattache && (
                                            <span className="text-warning small fw-bold">
                                                ⚠ {info.nom_eleve} {info.prenoms_eleve} — déjà rattaché à un autre parent
                                            </span>
                                        )}
                                        {info === null && mat.trim() && (
                                            <span className="text-danger small">Matricule introuvable</span>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={() => supprimerMatricule(i)}
                                        >✕</button>
                                    </div>
                                );
                            })}
                            <button type="button" className="btn btn-outline-secondary btn-sm mt-1"
                                onClick={ajouterMatricule}>
                                + Ajouter un élève
                            </button>
                        </div>
                    </fieldset>

                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Parents" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouveauParent;
