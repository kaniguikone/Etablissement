import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = ['present', 'absent', 'retard'];

const DetailsAssiduite = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [eleves, setEleves]   = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [periodes, setPeriodes] = useState([]);
    const [form, setForm] = useState({
        date_assiduite: '',
        statut:         'present',
        remarque:       '',
        eleve_id:       '',
        matiere_id:     '',
        periode_id:     '',
    });

    useEffect(() => {
        api.get('/elevesTout').then((r) => setEleves(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((r) => setPeriodes(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get(`/assiduites/${id}`)
            .then((r) => {
                const a = r.data;
                setForm({
                    date_assiduite: a.date_assiduite || '',
                    statut:         a.statut || 'present',
                    remarque:       a.remarque || '',
                    eleve_id:       a.eleve_id || '',
                    matiere_id:     a.matiere_id || '',
                    periode_id:     a.periode_id || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données.'));
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/assiduites/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Assiduites'); })
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
                    <h2 className="mt-2 container mb-1">Modifier l'assiduité</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date_assiduite" value={form.date_assiduite} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Statut</label>
                            <select className="form-select" name="statut" value={form.statut} onChange={handleChange} required>
                                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Remarque</label>
                            <input type="text" className="form-control" name="remarque" value={form.remarque} onChange={handleChange} />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Élève</label>
                            <select className="form-select" name="eleve_id" value={form.eleve_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom_eleve} {e.prenoms_eleve}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Matière</label>
                            <select className="form-select" name="matiere_id" value={form.matiere_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Période</label>
                            <select className="form-select" name="periode_id" value={form.periode_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {periodes.map((p) => <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>)}
                            </select>
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Assiduites" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsAssiduite;
