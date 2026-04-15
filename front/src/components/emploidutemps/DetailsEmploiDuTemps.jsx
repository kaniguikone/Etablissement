import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const DetailsEmploiDuTemps = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();

    const [classes, setClasses]         = useState([]);
    const [matieres, setMatieres]       = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [chargement, setChargement]   = useState(false);

    const [form, setForm] = useState({
        classe_id:     '',
        matiere_id:    '',
        enseignant_id: '',
        jour:          '',
        heure_debut:   '',
        heure_fin:     '',
    });

    useEffect(() => {
        api.get('/classesTout').then((r) => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/enseignantsTout').then((r) => setEnseignants(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get(`/emploiDuTemps/${id}`).then((r) => {
            const c = r.data;
            setForm({
                classe_id:     String(c.classe_id),
                matiere_id:    String(c.matiere_id),
                enseignant_id: String(c.enseignant_id),
                jour:          c.jour,
                heure_debut:   c.heure_debut.slice(0, 5),
                heure_fin:     c.heure_fin.slice(0, 5),
            });
        }).catch(() => toast.error('Impossible de charger le créneau.'));
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        setChargement(true);
        api.put(`/emploiDuTemps/${id}`, form)
            .then(() => navigate(`/EmploiDuTemps?classe_id=${form.classe_id}`))
            .catch((err) => {
                const data = err.response?.data;
                if (data?.erreurs?.length) {
                    data.erreurs.forEach((msg) => toast.error(msg));
                } else {
                    toast.error(data?.message || 'Erreur lors de la mise à jour.');
                }
                setChargement(false);
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Modifier le créneau</h4>
                    <Link to="/EmploiDuTemps" className="btn btn-secondary btn-sm">Retour</Link>
                </div>

                <form onSubmit={handleSubmit} className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">Classe *</label>
                        <select className="form-select form-select-sm" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                            <option value="">Sélectionner</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Matière *</label>
                        <select className="form-select form-select-sm" name="matiere_id" value={form.matiere_id} onChange={handleChange} required>
                            <option value="">Sélectionner</option>
                            {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Enseignant *</label>
                        <select className="form-select form-select-sm" name="enseignant_id" value={form.enseignant_id} onChange={handleChange} required>
                            <option value="">Sélectionner</option>
                            {enseignants.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.nom_enseignant} {e.prenoms_enseignant}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Jour *</label>
                        <select className="form-select form-select-sm" name="jour" value={form.jour} onChange={handleChange} required>
                            <option value="">Sélectionner</option>
                            {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j}</option>)}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Heure début *</label>
                        <input type="time" className="form-control form-control-sm" name="heure_debut" value={form.heure_debut} onChange={handleChange} required />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Heure fin *</label>
                        <input type="time" className="form-control form-control-sm" name="heure_fin" value={form.heure_fin} onChange={handleChange} required />
                    </div>

                    <div className="col-12 mb-3">
                        <button type="submit" className="btn btn-warning btn-sm" disabled={chargement}>
                            {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                            Mettre à jour
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsEmploiDuTemps;
