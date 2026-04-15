import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvelEnseignant = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [form, setForm]     = useState({
        matricule_enseignant: '', nom_enseignant: '', prenoms_enseignant: '',
        genre_enseignant: '', telephone_enseignant: '', email_enseignant: '',
        date_naissance_enseignant: '', date_embauche_enseignant: '', statut_enseignant: '',
    });

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/enseignants', form)
            .then(() => { toast.success('Enseignant enregistré avec succès.'); navigate('/Enseignants'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de l'enregistrement.");
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouvel enseignant</h2>
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

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Enseignants" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvelEnseignant;
