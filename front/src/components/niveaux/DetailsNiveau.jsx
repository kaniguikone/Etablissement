import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsNiveau = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nom_niveau: '',
        abbr_niveau: '',
    });

    useEffect(() => {
        api.get(`/niveaux/${id}`)
            .then((res) => {
                const n = res.data;
                setForm({
                    nom_niveau: n.nom_niveau || '',
                    abbr_niveau: n.abbr_niveau || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de ce niveau.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        api.put(`/niveaux/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Niveaux'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de la mise à jour.");
                }
            });
    };

    return (
        <section className="content content-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Détails du niveau</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Nom du niveau</label>
                            <input type="text" className="form-control" name="nom_niveau" value={form.nom_niveau} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Abréviation</label>
                            <input type="text" className="form-control" name="abbr_niveau" value={form.abbr_niveau} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Niveaux" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsNiveau;
