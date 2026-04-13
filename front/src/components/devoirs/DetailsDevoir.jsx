import { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsDevoir = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [classes, setClasses]         = useState([]);
    const [niveaux, setNiveaux]         = useState([]);
    const [matieres, setMatieres]       = useState([]);
    const [periodes, setPeriodes]       = useState([]);
    const [typeDevoirs, setTypeDevoirs] = useState([]);
    const [portee, setPortee]           = useState('classe');

    const [form, setForm] = useState({
        code_devoir: '', date_devoir: '', coeff_devoir: '',
        type_devoir_id: '', matiere_id: '',
        classe_id: '', niveau_id: '', periode_id: '',
    });

    useEffect(() => {
        api.get('/classesTout').then((res) => setClasses(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/matieres').then((res) => setMatieres(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((res) => setPeriodes(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/typeDevoirs').then((res) => setTypeDevoirs(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get(`/devoirs/${id}`)
            .then((res) => {
                const d = res.data;
                setPortee(d.niveau_id ? 'niveau' : 'classe');
                setForm({
                    code_devoir:    d.code_devoir    || '',
                    date_devoir:    d.date_devoir    || '',
                    coeff_devoir:   d.coeff_devoir   || '',
                    type_devoir_id: d.type_devoir_id || '',
                    matiere_id:     d.matiere_id     || '',
                    classe_id:      d.classe_id      || '',
                    niveau_id:      d.niveau_id      || '',
                    periode_id:     d.periode_id     || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données de ce devoir.'));
    }, [id]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handlePorteeChange = (val) => {
        setPortee(val);
        setForm((prev) => ({ ...prev, classe_id: '', niveau_id: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            classe_id: portee === 'classe' ? form.classe_id : '',
            niveau_id: portee === 'niveau' ? form.niveau_id : '',
        };
        api.put(`/devoirs/${id}`, payload)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Devoirs'); })
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
                    <h2 className="mt-2 container mb-1">Détails du devoir</h2>
                    <NavLink to={`/SaisieNotes/${id}`} className="btn btn-success mt-2 me-3">
                        Saisir les notes
                    </NavLink>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Type de devoir</label>
                            <select className="form-select" name="type_devoir_id" value={form.type_devoir_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {typeDevoirs.map((t) => (
                                    <option key={t.id} value={t.id}>{t.code_type_devoir} — {t.description_type_devoir}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Matière</label>
                            <select className="form-select" name="matiere_id" value={form.matiere_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {matieres.map((m) => (
                                    <option key={m.id} value={m.id}>{m.libelle_matiere}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Période</label>
                            <select className="form-select" name="periode_id" value={form.periode_id} onChange={handleChange}>
                                <option value="">Sélectionner</option>
                                {periodes.map((p) => (
                                    <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3 col-md-12">
                            <label className="form-label">Ce devoir concerne</label>
                            <div className="d-flex gap-3">
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" id="portee_classe" checked={portee === 'classe'} onChange={() => handlePorteeChange('classe')} />
                                    <label className="form-check-label" htmlFor="portee_classe">Une classe</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" id="portee_niveau" checked={portee === 'niveau'} onChange={() => handlePorteeChange('niveau')} />
                                    <label className="form-check-label" htmlFor="portee_niveau">Tout un niveau</label>
                                </div>
                            </div>
                        </div>

                        {portee === 'classe' ? (
                            <div className="mb-3 col-md-6">
                                <label className="form-label">Classe</label>
                                <select className="form-select" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                    <option value="">Sélectionner</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nom_classe}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="mb-3 col-md-6">
                                <label className="form-label">Niveau</label>
                                <select className="form-select" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                    <option value="">Sélectionner</option>
                                    {niveaux.map((n) => (
                                        <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-3 col-md-6">
                            <label className="form-label">Code du devoir</label>
                            <input type="text" className="form-control" name="code_devoir" value={form.code_devoir} onChange={handleChange} required />
                        </div>

                        <div className="mb-3 col-md-6">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date_devoir" value={form.date_devoir} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Coefficient</label>
                            <input type="number" step="0.5" min="0" className="form-control" name="coeff_devoir" value={form.coeff_devoir} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Devoirs" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsDevoir;
