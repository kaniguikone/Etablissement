import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsPeriode = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        libelle_periode: '',
        abbr_libelle_periode: '',
        code_periode: '',
        annee: '',
        date_debut: '',
        date_fin: '',
    });

    useEffect(() => {
        api.get(`/periodes/${id}`)
            .then((res) => {
                const p = res.data;
                setForm({
                    libelle_periode: p.libelle_periode || '',
                    abbr_libelle_periode: p.abbr_libelle_periode || '',
                    code_periode: p.code_periode || '',
                    annee: p.annee || '',
                    date_debut: p.date_debut?.substring(0, 10) || '',
                    date_fin:   p.date_fin?.substring(0, 10)   || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de cette période.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/periodes/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Periodes'); })
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
                    <h2 className="mt-2 container mb-1">Détails de la période</h2>
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
                            <input type="text" className="form-control" name="annee" value={form.annee} onChange={handleChange} required />
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
                        <NavLink to="/Periodes" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsPeriode;
