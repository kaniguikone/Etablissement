import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsEleve = () => {
    const { toast } = useToast();
    const { id }   = useParams();
    const navigate = useNavigate();
    const fileRef  = useRef(null);

    const [classes, setClasses]             = useState([]);
    const [photoPreview, setPhotoPreview]   = useState(null);
    const [photoFile, setPhotoFile]         = useState(null);
    const [uploadEnCours, setUploadEnCours] = useState(false);

    const [form, setForm] = useState({
        matricule_eleve: '', nom_eleve: '', prenoms_eleve: '',
        date_naissance_eleve: '', genre_eleve: '',
        lieu_naissance_eleve: '', nationalite_eleve: '', adresse_eleve: '',
        classe_id: '',
    });

    useEffect(() => {
        api.get(`/eleves/${id}`).then((res) => {
            const e = res.data;
            setForm({
                matricule_eleve:      e.matricule_eleve      || '',
                nom_eleve:            e.nom_eleve            || '',
                prenoms_eleve:        e.prenoms_eleve        || '',
                date_naissance_eleve: e.date_naissance_eleve || '',
                genre_eleve:          e.genre_eleve          || '',
                lieu_naissance_eleve: e.lieu_naissance_eleve || '',
                nationalite_eleve:    e.nationalite_eleve    || '',
                adresse_eleve:        e.adresse_eleve        || '',
                classe_id:            e.classe_id            || '',
            });
            if (e.photo_url) setPhotoPreview(e.photo_url);
        }).catch(() => toast.error('Impossible de charger les données de cet élève.'));

        api.get('/classesTout').then((r) => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    // Upload de la photo (appel séparé)
    const handleUploadPhoto = () => {
        if (!photoFile) return;
        setUploadEnCours(true);
        const data = new FormData();
        data.append('photo_eleve', photoFile);
        api.post(`/eleves/${id}/photo`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                toast.success('Photo mise à jour.');
                setPhotoPreview(res.data.photo_url);
                setPhotoFile(null);
            })
            .catch(() => toast.error('Erreur lors de l\'upload de la photo.'))
            .finally(() => setUploadEnCours(false));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/eleves/${id}`, form)
            .then(() => toast.success('Modifications enregistrées.'))
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de la mise à jour.");
            });
    };

    return (
        <section className="content content-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between align-items-center mb-2 border px-3">
                    <h2 className="mt-2 mb-1">Détails de l'élève</h2>
                    <NavLink to={`/SanctionsEleve/${id}`} className="btn btn-outline-danger btn-sm">
                        <i className="fas fa-gavel me-1" />Sanctions
                    </NavLink>
                </div>
                {/* Section photo */}
                <div className="row mb-3 align-items-center">
                    <div className="col-auto">
                        <div
                            style={{
                                width: 100, height: 100, borderRadius: '50%',
                                overflow: 'hidden', border: '2px solid #dee2e6',
                                background: '#f8f9fa', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                            onClick={() => fileRef.current?.click()}
                            title="Cliquer pour changer la photo"
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <i className="fas fa-user fa-3x text-secondary" />
                            )}
                        </div>
                    </div>
                    <div className="col">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="d-none"
                            onChange={handlePhotoChange}
                        />
                        <button type="button" className="btn btn-outline-secondary btn-sm me-2" onClick={() => fileRef.current?.click()}>
                            {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                        </button>
                        {photoFile && (
                            <button type="button" className="btn btn-success btn-sm" onClick={handleUploadPhoto} disabled={uploadEnCours}>
                                {uploadEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                                Enregistrer la photo
                            </button>
                        )}
                        <div className="form-text mt-1">JPG, PNG, GIF — max 2 Mo. Cliquer sur le cercle ou le bouton.</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">
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
                        <NavLink to="/Eleves" className="btn btn-secondary">Retour</NavLink>
                        <NavLink to={`/PaiementsEleve/${id}`} className="btn btn-outline-success">
                            💳 Paiements
                        </NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsEleve;
