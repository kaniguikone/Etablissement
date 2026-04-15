import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsMatiere = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        abbr_matiere: '',
        libelle_matiere: '',
        description_matiere: '',
    });

    useEffect(() => {
        api.get(`/matieres/${id}`)
            .then((res) => {
                const m = res.data;
                setForm({
                    abbr_matiere: m.abbr_matiere || '',
                    libelle_matiere: m.libelle_matiere || '',
                    description_matiere: m.description_matiere || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de cette matière.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        api.put(`/matieres/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Matieres'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de la mise à jour.");
                }
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Détails de la matière</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Abréviation</label>
                            <input type="text" className="form-control" name="abbr_matiere" value={form.abbr_matiere} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-8">
                            <label className="form-label">Libellé</label>
                            <input type="text" className="form-control" name="libelle_matiere" value={form.libelle_matiere} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-12">
                            <label className="form-label">Description</label>
                            <textarea className="form-control" name="description_matiere" value={form.description_matiere} onChange={handleChange} rows={3} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Matieres" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsMatiere;
