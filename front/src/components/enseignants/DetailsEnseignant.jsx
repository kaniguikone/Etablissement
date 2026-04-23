import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

/* ─── Section affectations ─────────────────────────────────────────── */
const SectionAffectations = ({ enseignantId }) => {
    const { toast } = useToast();
    const [affectations, setAffectations] = useState([]);
    const [classes,      setClasses]      = useState([]);
    const [matieres,     setMatieres]     = useState([]);
    const [newClasse,    setNewClasse]     = useState('');
    const [newMatiere,   setNewMatiere]   = useState('');
    const [saving,       setSaving]       = useState(false);

    const charger = useCallback(() => {
        api.get(`/enseignants/${enseignantId}/affectations`).then(res => {
            setAffectations(res.data.affectations);
            setClasses(res.data.classes);
            setMatieres(res.data.matieres);
        });
    }, [enseignantId]);

    useEffect(() => { charger(); }, [charger]);

    const nbMatieres = new Set(affectations.map(a => a.matiere_id)).size;
    const nbClasses  = new Set(affectations.map(a => a.classe_id)).size;

    const ajouter = () => {
        if (!newClasse || !newMatiere) { toast.error('Sélectionnez une classe et une matière.'); return; }

        const doublon = affectations.some(a => a.classe_id == newClasse && a.matiere_id == newMatiere);
        if (doublon) { toast.error('Cette combinaison classe / matière existe déjà.'); return; }

        const classeNom   = classes.find(c => c.id == newClasse);
        const matiereNom  = matieres.find(m => m.id == newMatiere);
        const nouvelleAff = {
            id: null,
            classe_id: parseInt(newClasse),
            matiere_id: parseInt(newMatiere),
            nom_classe: classeNom?.nom_classe,
            abbr_classe: classeNom?.abbr_classe,
            libelle_matiere: matiereNom?.libelle_matiere,
            abbr_matiere: matiereNom?.abbr_matiere,
        };

        const nouvelles       = [...affectations, nouvelleAff];
        const nbMat = new Set(nouvelles.map(a => a.matiere_id)).size;
        const nbCls = new Set(nouvelles.map(a => a.classe_id)).size;

        if (nbMat > 3) { toast.error('Maximum 3 matières différentes par enseignant.'); return; }
        if (nbCls > 7) { toast.error('Maximum 7 classes par enseignant.'); return; }

        setAffectations(nouvelles);
        setNewClasse(''); setNewMatiere('');
    };

    const supprimer = (index) => {
        setAffectations(affectations.filter((_, i) => i !== index));
    };

    const sauvegarder = () => {
        setSaving(true);
        const payload = affectations.map(a => ({ classe_id: a.classe_id, matiere_id: a.matiere_id }));
        api.post(`/enseignants/${enseignantId}/affectations`, { affectations: payload })
            .then(() => { toast.success('Affectations enregistrées.'); charger(); })
            .catch(err => toast.error(err.response?.data?.message || 'Erreur lors de l\'enregistrement.'))
            .finally(() => setSaving(false));
    };

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Affectations (classes &amp; matières)</h5>
                <span className="text-muted small">
                    {nbMatieres}/3 matières · {nbClasses}/7 classes
                </span>
            </div>

            {/* Tableau des affectations */}
            {affectations.length > 0 ? (
                <table className="table table-sm table-bordered mb-3">
                    <thead className="table-light">
                        <tr>
                            <th>Classe</th>
                            <th>Matière</th>
                            <th style={{ width: 48 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {affectations.map((a, i) => (
                            <tr key={i}>
                                <td>{a.nom_classe} <span className="text-muted small">({a.abbr_classe})</span></td>
                                <td>{a.libelle_matiere} <span className="text-muted small">({a.abbr_matiere})</span></td>
                                <td className="text-center">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger py-0 px-1"
                                        onClick={() => supprimer(i)}
                                        title="Supprimer"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-muted small fst-italic mb-3">Aucune affectation enregistrée.</p>
            )}

            {/* Formulaire d'ajout */}
            <div className="row g-2 align-items-end mb-3">
                <div className="col-md-4">
                    <label className="form-label form-label-sm mb-1">Classe</label>
                    <select className="form-select form-select-sm" value={newClasse} onChange={e => setNewClasse(e.target.value)}>
                        <option value="">-- Choisir --</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.nom_classe} ({c.abbr_classe})</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <label className="form-label form-label-sm mb-1">Matière</label>
                    <select className="form-select form-select-sm" value={newMatiere} onChange={e => setNewMatiere(e.target.value)}>
                        <option value="">-- Choisir --</option>
                        {matieres.map(m => (
                            <option key={m.id} value={m.id}>{m.libelle_matiere} ({m.abbr_matiere})</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={ajouter}>
                        <i className="fas fa-plus me-1"></i>Ajouter
                    </button>
                </div>
            </div>

            <div className="d-flex justify-content-end">
                <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={sauvegarder}
                    disabled={saving}
                >
                    {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-save me-1"></i>}
                    Enregistrer les affectations
                </button>
            </div>
        </div>
    );
};

/* ─── Page principale ──────────────────────────────────────────────── */
const DetailsEnseignant = () => {
    const { toast } = useToast();
    const { id }   = useParams();
    const navigate = useNavigate();
    const [form, setForm]     = useState({
        matricule_enseignant: '', nom_enseignant: '', prenoms_enseignant: '',
        genre_enseignant: '', telephone_enseignant: '', email_enseignant: '',
        date_naissance_enseignant: '', date_embauche_enseignant: '', statut_enseignant: '',
        password: '',
    });

    useEffect(() => {
        api.get(`/enseignants/${id}`).then((res) => {
            const e = res.data;
            setForm({
                matricule_enseignant:      e.matricule_enseignant      || '',
                nom_enseignant:            e.nom_enseignant            || '',
                prenoms_enseignant:        e.prenoms_enseignant        || '',
                genre_enseignant:          e.genre_enseignant          || '',
                telephone_enseignant:      e.telephone_enseignant      || '',
                email_enseignant:          e.email_enseignant          || '',
                date_naissance_enseignant: e.date_naissance_enseignant?.substring(0, 10) || '',
                date_embauche_enseignant:  e.date_embauche_enseignant?.substring(0, 10)  || '',
                statut_enseignant:         e.statut_enseignant         || '',
            });
        }).catch(() => toast.error('Impossible de charger les données de cet enseignant.'));
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/enseignants/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Enseignants'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de la mise à jour.");
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Détails de l'enseignant</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        <div className="col-md-4">
                            <label className="form-label">Matricule *</label>
                            <input type="text" className="form-control form-control-sm" name="matricule_enseignant" value={form.matricule_enseignant} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nom *</label>
                            <input type="text" className="form-control form-control-sm" name="nom_enseignant" value={form.nom_enseignant} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Prénoms *</label>
                            <input type="text" className="form-control form-control-sm" name="prenoms_enseignant" value={form.prenoms_enseignant} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Genre</label>
                            <select className="form-select form-select-sm" name="genre_enseignant" value={form.genre_enseignant} onChange={handleChange}>
                                <option value="">Sélectionner</option>
                                <option value="M">Masculin</option>
                                <option value="F">Féminin</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Téléphone</label>
                            <input type="text" className="form-control form-control-sm" name="telephone_enseignant" value={form.telephone_enseignant} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control form-control-sm" name="email_enseignant" value={form.email_enseignant} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Date de naissance</label>
                            <input type="date" className="form-control form-control-sm" name="date_naissance_enseignant" value={form.date_naissance_enseignant} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Date d'embauche</label>
                            <input type="date" className="form-control form-control-sm" name="date_embauche_enseignant" value={form.date_embauche_enseignant} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Statut</label>
                            <select className="form-select form-select-sm" name="statut_enseignant" value={form.statut_enseignant} onChange={handleChange}>
                                <option value="">Sélectionner</option>
                                <option value="CDI">CDI</option>
                                <option value="CDD">CDD</option>
                                <option value="Stagiaire">Stagiaire</option>
                                <option value="Vacataire">Vacataire</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nouveau mot de passe</label>
                            <input type="password" className="form-control form-control-sm" name="password" value={form.password} onChange={handleChange} placeholder="Laisser vide pour ne pas modifier" autoComplete="new-password" />
                        </div>

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Enseignants" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>

                <hr />
                <SectionAffectations enseignantId={id} />
                <div className="pb-3"></div>
            </div>
        </section>
    );
};

export default DetailsEnseignant;
