import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvelleClasse = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [niveaux, setNiveaux]         = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [form, setForm]               = useState({
        num_classe: '', nom_classe: '', abbr_classe: '', niveau_id: '',
        salle_classe: '', effectif_max_classe: '', professeur_principal_id: '',
    });

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/enseignantsTout').then((r) => setEnseignants(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/classes', form)
            .then(() => { toast.success('Classe enregistrée avec succès.'); navigate('/Classes'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de l'enregistrement.");
            });
    };

    return (
        <section className="content content-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouvelle classe</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        <div className="col-md-4">
                            <label className="form-label">Numéro de classe *</label>
                            <input type="text" className="form-control form-control-sm" name="num_classe" value={form.num_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nom de la classe *</label>
                            <input type="text" className="form-control form-control-sm" name="nom_classe" value={form.nom_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Abréviation *</label>
                            <input type="text" className="form-control form-control-sm" name="abbr_classe" value={form.abbr_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Niveau *</label>
                            <select className="form-select form-select-sm" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                <option value="">Sélectionner un niveau</option>
                                {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Salle</label>
                            <input type="text" className="form-control form-control-sm" name="salle_classe" value={form.salle_classe} onChange={handleChange} placeholder="Ex: Salle A1" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Effectif maximum</label>
                            <input type="number" className="form-control form-control-sm" name="effectif_max_classe" value={form.effectif_max_classe} onChange={handleChange} min="1" />
                        </div>
                        <div className="col-md-12">
                            <label className="form-label">Professeur principal</label>
                            <select className="form-select form-select-sm" name="professeur_principal_id" value={form.professeur_principal_id} onChange={handleChange}>
                                <option value="">Aucun</option>
                                {enseignants.map((e) => (
                                    <option key={e.id} value={e.id}>{e.nom_enseignant} {e.prenoms_enseignant}</option>
                                ))}
                            </select>
                        </div>

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Classes" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvelleClasse;
