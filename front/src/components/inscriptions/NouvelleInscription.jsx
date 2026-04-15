import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvelleInscription = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [niveaux, setNiveaux]   = useState([]);
    const [classes, setClasses]   = useState([]);
    const [saving, setSaving]     = useState(false);

    const [form, setForm] = useState({
        // Élève
        nom_eleve: '', prenoms_eleve: '', date_naissance_eleve: '',
        genre_eleve: 'M', lieu_naissance_eleve: '', nationalite_eleve: 'Ivoirienne',
        adresse_eleve: '', classe_id: '',
        // Parent
        nom_parent: '', prenom_parent: '', numero_parent: '',
        email_parent: '', relation_parent: 'Père',
        profession_parent: '', adresse_parent: '',
    });

    const [niveauId, setNiveauId] = useState('');

    useEffect(() => {
        api.get('/niveaux').then(r => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    useEffect(() => {
        if (!niveauId) { setClasses([]); return; }
        api.get(`/classesNiveaux/${niveauId}`).then(r => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, [niveauId]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = e => {
        e.preventDefault();
        setSaving(true);
        api.post('/inscriptions/directe', form)
            .then((r) => {
                toast.success(`Élève ${r.data.eleve.nom_eleve} ${r.data.eleve.prenoms_eleve} inscrit avec succès (${r.data.eleve.matricule_eleve}).`);
                setSaving(false);
                setTimeout(() => navigate('/Inscriptions'), 2000);
            })
            .catch((e) => {
                const errors = e.response?.data?.errors;
                toast.error(errors ? Object.values(errors).flat().join(' — ') : 'Erreur lors de l\'inscription.');
                setSaving(false);
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Nouvelle inscription (établissement)</h4>
                    <NavLink to="/Inscriptions" className="btn btn-secondary btn-sm">Retour</NavLink>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* ── Élève ── */}
                    <h5 className="mt-3 mb-2 border-bottom pb-1">🎓 Informations de l'élève</h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">Nom *</label>
                            <input className="form-control" name="nom_eleve" value={form.nom_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Prénoms *</label>
                            <input className="form-control" name="prenoms_eleve" value={form.prenoms_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Date de naissance *</label>
                            <input type="date" className="form-control" name="date_naissance_eleve" value={form.date_naissance_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Genre *</label>
                            <select className="form-select" name="genre_eleve" value={form.genre_eleve} onChange={handleChange}>
                                <option value="M">Masculin</option>
                                <option value="F">Féminin</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Lieu de naissance</label>
                            <input className="form-control" name="lieu_naissance_eleve" value={form.lieu_naissance_eleve} onChange={handleChange} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Nationalité</label>
                            <input className="form-control" name="nationalite_eleve" value={form.nationalite_eleve} onChange={handleChange} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Adresse</label>
                            <input className="form-control" name="adresse_eleve" value={form.adresse_eleve} onChange={handleChange} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Niveau *</label>
                            <select className="form-select" value={niveauId} onChange={e => { setNiveauId(e.target.value); setForm({...form, classe_id: ''}); }} required>
                                <option value="">Sélectionner</option>
                                {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Classe *</label>
                            <select className="form-select" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── Parent ── */}
                    <h5 className="mt-4 mb-2 border-bottom pb-1">👨‍👩‍👧 Informations du parent / tuteur</h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">Nom *</label>
                            <input className="form-control" name="nom_parent" value={form.nom_parent} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Prénom *</label>
                            <input className="form-control" name="prenom_parent" value={form.prenom_parent} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Téléphone *</label>
                            <input className="form-control" name="numero_parent" value={form.numero_parent} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-control" name="email_parent" value={form.email_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Relation</label>
                            <select className="form-select" name="relation_parent" value={form.relation_parent} onChange={handleChange}>
                                {['Père', 'Mère', 'Tuteur', 'Autre'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Profession</label>
                            <input className="form-control" name="profession_parent" value={form.profession_parent} onChange={handleChange} />
                        </div>
                        <div className="col-md-12">
                            <label className="form-label">Adresse</label>
                            <input className="form-control" name="adresse_parent" value={form.adresse_parent} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4 mb-3">
                        <NavLink to="/Inscriptions" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                            Inscrire l'élève
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvelleInscription;
