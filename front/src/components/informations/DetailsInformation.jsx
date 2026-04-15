import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsInformation = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        date_info: '',
        titre: '',
        contenu: '',
    });

    useEffect(() => {
        api.get(`/informations/${id}`)
            .then((res) => {
                const info = res.data;
                setForm({
                    date_info: info.date_info || '',
                    titre: info.titre || '',
                    contenu: info.contenu || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de cette information.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/informations/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Informations'); })
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
                    <h2 className="mt-2 container mb-1">Détails de l'information</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date_info" value={form.date_info} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-8">
                            <label className="form-label">Titre</label>
                            <input type="text" className="form-control" name="titre" value={form.titre} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-12">
                            <label className="form-label">Contenu</label>
                            <textarea className="form-control" name="contenu" value={form.contenu} onChange={handleChange} rows={5} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Informations" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsInformation;
