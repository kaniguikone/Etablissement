import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvelEleve = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [classes, setClasses]   = useState([]);
    const [preview, setPreview]   = useState(null);
    const [photo, setPhoto]       = useState(null);
    const [form, setForm]         = useState({
        matricule_eleve: '', nom_eleve: '', prenoms_eleve: '',
        date_naissance_eleve: '', genre_eleve: '',
        lieu_naissance_eleve: '', nationalite_eleve: '', adresse_eleve: '',
        classe_id: '',
    });

    useEffect(() => {
        api.get('/classesTout').then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (photo) data.append('photo_eleve', photo);

        api.post('/eleves', data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(() => { toast.success('Élève enregistré avec succès.'); navigate('/Eleves'); })
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
                    <h2 className="mt-2 container mb-1">Nouvel élève</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        {/* Photo */}
                        <div className="col-md-12 d-flex align-items-center gap-4 mb-2">
                            <div
                                className="rounded-circle border bg-secondary d-flex align-items-center justify-content-center overflow-hidden"
                                style={{ width: 90, height: 90, flexShrink: 0 }}
                            >
                                {preview
                                    ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <i className="fas fa-user fa-2x text-white" />
                                }
                            </div>
                            <div>
                                <label className="form-label mb-1">Photo de l'élève</label>
                                <input
                                    type="file"
                                    className="form-control form-control-sm"
                                    accept="image/*"
                                    onChange={handlePhoto}
                                />
                                <div className="form-text">Optionnel — JPG, PNG, max 2 Mo</div>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">Matricule *</label>
                            <input type="text" className="form-control form-control-sm" name="matricule_eleve" value={form.matricule_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nom *</label>
                            <input type="text" className="form-control form-control-sm" name="nom_eleve" value={form.nom_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Prénoms *</label>
                            <input type="text" className="form-control form-control-sm" name="prenoms_eleve" value={form.prenoms_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Date de naissance *</label>
                            <input type="date" className="form-control form-control-sm" name="date_naissance_eleve" value={form.date_naissance_eleve} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Genre</label>
                            <select className="form-select form-select-sm" name="genre_eleve" value={form.genre_eleve} onChange={handleChange}>
                                <option value="">Sélectionner</option>
                                <option value="M">Masculin</option>
                                <option value="F">Féminin</option>
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Classe *</label>
                            <select className="form-select form-select-sm" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                <option value="">Sélectionner une classe</option>
                                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Lieu de naissance</label>
                            <input type="text" className="form-control form-control-sm" name="lieu_naissance_eleve" value={form.lieu_naissance_eleve} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nationalité</label>
                            <input type="text" className="form-control form-control-sm" name="nationalite_eleve" value={form.nationalite_eleve} onChange={handleChange} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Adresse</label>
                            <input type="text" className="form-control form-control-sm" name="adresse_eleve" value={form.adresse_eleve} onChange={handleChange} />
                        </div>

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Eleves" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvelEleve;
