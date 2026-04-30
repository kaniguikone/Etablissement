import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsScolarite = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [niveaux, setNiveaux] = useState([]);
    const [form, setForm] = useState({
        libelle_echeance: '',
        date_echeance: '',
        montant_echeance: '',
        niveau_id: '',
    });

    useEffect(() => {
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get(`/scolarites/${id}`)
            .then((res) => {
                const s = res.data;
                setForm({
                    libelle_echeance: s.libelle_echeance || '',
                    date_echeance: s.date_echeance || '',
                    montant_echeance: s.montant_echeance || '',
                    niveau_id: s.niveau_id || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de cette scolarité.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/scolarites/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Scolarites'); })
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
                    <h2 className="mt-2 container mb-1">Détails de la scolarité</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Libellé échéance</label>
                            <input type="text" className="form-control" name="libelle_echeance" value={form.libelle_echeance} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Niveau</label>
                            <select className="form-select" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                <option value="">Sélectionner un niveau</option>
                                {niveaux.map((n) => (
                                    <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Date échéance</label>
                            <input type="date" className="form-control" name="date_echeance" value={form.date_echeance} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Montant</label>
                            <input type="text" className="form-control" name="montant_echeance" value={form.montant_echeance} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Scolarites" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsScolarite;
