import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvellePeriode = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        libelle_periode: '',
        abbr_libelle_periode: '',
        code_periode: '',
        annee: '',
        date_debut: '',
        date_fin: '',
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/periodes', form)
            .then(() => { toast.success('Période enregistrée avec succès.'); navigate('/Periodes'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                }
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouvelle période</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Libellé</label>
                            <input type="text" className="form-control" name="libelle_periode" value={form.libelle_periode} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Abréviation</label>
                            <input type="text" className="form-control" name="abbr_libelle_periode" value={form.abbr_libelle_periode} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Code court</label>
                            <input type="text" className="form-control" name="code_periode" value={form.code_periode} onChange={handleChange} placeholder="T1, T2…" maxLength={10} />
                            <div className="form-text">Utilisé dans les codes devoirs</div>
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Année</label>
                            <input type="text" className="form-control" name="annee" value={form.annee} onChange={handleChange} placeholder="2024-2025" required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Date de début</label>
                            <input type="date" className="form-control" name="date_debut" value={form.date_debut} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Date de fin</label>
                            <input type="date" className="form-control" name="date_fin" value={form.date_fin} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Periodes" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvellePeriode;
