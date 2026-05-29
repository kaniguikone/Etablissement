import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import api, { backendUrl } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const HANDICAPS = [
    ['moteur','Moteur'], ['malvoyant','Malvoyant'], ['malentendant','Malentendant'],
    ['albinisme','Albinisme'], ['nanisme','Nanisme'], ['begayement','Bégaiement'], ['autiste','Autiste'],
];

const STATUT_BADGE = { actif: 'success', inactif: 'secondary', abandon: 'warning', decede: 'danger' };

const DetailsEleve = () => {
    const { toast } = useToast();
    const { id }    = useParams();
    const fileRef   = useRef(null);

    const [classes, setClasses]             = useState([]);
    const [photoPreview, setPhotoPreview]   = useState(null);
    const [photoFile, setPhotoFile]         = useState(null);
    const [uploadEnCours, setUploadEnCours] = useState(false);

    const [form, setForm] = useState({
        matricule_eleve: '', nom_eleve: '', prenoms_eleve: '',
        date_naissance_eleve: '', genre_eleve: '',
        lieu_naissance_eleve: '', nationalite_eleve: '', adresse_eleve: '',
        classe_id: '', statut_eleve: 'actif',
        langue2: '', est_boursier: false, est_demi_boursier: false, est_affecte: false,
        types_handicap: [], statut_orphelin: '',
    });

    useEffect(() => {
        api.get(`/eleves/${id}`).then((res) => {
            const e = res.data;
            setForm({
                matricule_eleve:      e.matricule_eleve      || '',
                nom_eleve:            e.nom_eleve            || '',
                prenoms_eleve:        e.prenoms_eleve        || '',
                date_naissance_eleve: e.date_naissance_eleve?.substring(0, 10) || '',
                genre_eleve:          e.genre_eleve          || '',
                lieu_naissance_eleve: e.lieu_naissance_eleve || '',
                nationalite_eleve:    e.nationalite_eleve    || '',
                adresse_eleve:        e.adresse_eleve        || '',
                classe_id:            e.classe_id            || '',
                statut_eleve:         e.statut_eleve         || 'actif',
                langue2:              e.langue2              || '',
                est_boursier:         !!e.est_boursier,
                est_demi_boursier:    !!e.est_demi_boursier,
                est_affecte:          !!e.est_affecte,
                types_handicap:       Array.isArray(e.types_handicap) ? e.types_handicap : [],
                statut_orphelin:      e.statut_orphelin      || '',
            });
            if (e.photo_url) setPhotoPreview(backendUrl(e.photo_url));
        }).catch(() => toast.error('Impossible de charger les données de cet élève.'));

        api.get('/classesTout').then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, [id]);

    const handleChange = (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [e.target.name]: val });
    };

    const handleHandicap = (value, checked) => {
        setForm(f => ({
            ...f,
            types_handicap: checked
                ? [...f.types_handicap, value]
                : f.types_handicap.filter(h => h !== value),
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleUploadPhoto = () => {
        if (!photoFile) return;
        setUploadEnCours(true);
        const data = new FormData();
        data.append('photo_eleve', photoFile);
        api.post(`/eleves/${id}/photo`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                toast.success('Photo mise à jour.');
                setPhotoPreview(backendUrl(res.data.photo_url));
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
        <div className="page-wrapper">

            {/* En-tête */}
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h4 className="mb-0 fw-bold">
                    <i className="fas fa-user-edit me-2 text-primary" />Fiche élève
                </h4>
                <div className="d-flex gap-2">
                    <NavLink to={`/SanctionsEleve/${id}`} className="btn btn-sm btn-outline-danger">
                        <i className="fas fa-gavel me-1" />Sanctions
                    </NavLink>
                    <NavLink to={`/PaiementsEleve/${id}`} className="btn btn-sm btn-outline-success">
                        <i className="fas fa-credit-card me-1" />Paiements
                    </NavLink>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-3 align-items-stretch mb-3">

                    {/* ── Colonne gauche : Identité ── */}
                    <div className="col-xl-6">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f0fe', borderBottom: '2px solid #c2d3fb' }}>
                                <i className="fas fa-id-card text-primary" />
                                <span className="fw-semibold text-primary">Identité &amp; Coordonnées</span>
                            </div>
                            <div className="card-body p-3">

                                {/* Photo */}
                                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                                    <div onClick={() => fileRef.current?.click()}
                                        title="Cliquer pour changer la photo"
                                        className="rounded-circle border border-2 d-flex align-items-center justify-content-center overflow-hidden bg-light flex-shrink-0"
                                        style={{ width: 68, height: 68, cursor: 'pointer' }}>
                                        {photoPreview
                                            ? <img src={photoPreview} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <i className="fas fa-user-circle fa-2x text-secondary" />}
                                    </div>
                                    <div className="flex-grow-1">
                                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={handlePhotoChange} />
                                        <div className="d-flex gap-2 align-items-center flex-wrap mb-1">
                                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                                                <i className="fas fa-camera me-1" />{photoPreview ? 'Changer' : 'Ajouter une photo'}
                                            </button>
                                            {photoFile && (
                                                <button type="button" className="btn btn-success btn-sm" onClick={handleUploadPhoto} disabled={uploadEnCours}>
                                                    {uploadEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                                                    <i className="fas fa-upload me-1" />Enregistrer
                                                </button>
                                            )}
                                        </div>
                                        <div className="form-text">JPG, PNG — max 2 Mo</div>
                                    </div>
                                </div>

                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Matricule <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="matricule_eleve" value={form.matricule_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Nom <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="nom_eleve" value={form.nom_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Prénoms <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="prenoms_eleve" value={form.prenoms_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Date de naissance <span className="text-danger">*</span></label>
                                        <input type="date" className="form-control form-control-sm" name="date_naissance_eleve" value={form.date_naissance_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Genre</label>
                                        <select className="form-select form-select-sm" name="genre_eleve" value={form.genre_eleve} onChange={handleChange}>
                                            <option value="">— Sélectionner</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Lieu de naissance</label>
                                        <input type="text" className="form-control form-control-sm" name="lieu_naissance_eleve" value={form.lieu_naissance_eleve} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Nationalité</label>
                                        <input type="text" className="form-control form-control-sm" name="nationalite_eleve" value={form.nationalite_eleve} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-8">
                                        <label className="form-label fw-medium mb-1">Adresse</label>
                                        <input type="text" className="form-control form-control-sm" name="adresse_eleve" value={form.adresse_eleve} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Colonne droite : Scolarité + Profil ── */}
                    <div className="col-xl-6 d-flex flex-column gap-3">

                        {/* Scolarité */}
                        <div className="card border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e3f2fd', borderBottom: '2px solid #90caf9' }}>
                                <i className="fas fa-school text-info" />
                                <span className="fw-semibold text-info">Scolarité</span>
                            </div>
                            <div className="card-body p-3">
                                <div className="row g-2 align-items-end">
                                    <div className="col-md-7">
                                        <label className="form-label fw-medium mb-1">Classe <span className="text-danger">*</span></label>
                                        <select className="form-select form-select-sm" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                            <option value="">— Sélectionner une classe</option>
                                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-medium mb-1">Statut</label>
                                        <select className="form-select form-select-sm" name="statut_eleve" value={form.statut_eleve} onChange={handleChange}>
                                            <option value="actif">Actif</option>
                                            <option value="inactif">Inactif</option>
                                            <option value="abandon">Abandon</option>
                                            <option value="decede">Décédé</option>
                                        </select>
                                    </div>
                                    <div className="col-md-2 d-flex align-items-end pb-1">
                                        <span className={`badge bg-${STATUT_BADGE[form.statut_eleve] || 'secondary'} w-100 text-center py-2`}>
                                            {form.statut_eleve.charAt(0).toUpperCase() + form.statut_eleve.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profil scolaire */}
                        <div className="card border-0 shadow-sm flex-grow-1">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f5e9', borderBottom: '2px solid #a5d6a7' }}>
                                <i className="fas fa-graduation-cap text-success" />
                                <span className="fw-semibold text-success">Profil scolaire &amp; Situation personnelle</span>
                            </div>
                            <div className="card-body p-3 d-flex flex-column gap-3">

                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium mb-1">Langue 2</label>
                                        <select className="form-select form-select-sm" name="langue2" value={form.langue2} onChange={handleChange}>
                                            <option value="">— Non renseigné</option>
                                            <option value="espagnol">Espagnol</option>
                                            <option value="allemand">Allemand</option>
                                            <option value="autre">Autre</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium mb-1">Statut orphelin</label>
                                        <select className="form-select form-select-sm" name="statut_orphelin" value={form.statut_orphelin} onChange={handleChange}>
                                            <option value="">— Non concerné</option>
                                            <option value="pere">Orphelin de père</option>
                                            <option value="mere">Orphelin de mère</option>
                                            <option value="les_deux">Orphelin des deux parents</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="small fw-medium text-uppercase text-muted mb-2" style={{ letterSpacing: '.05em' }}>Handicap(s)</div>
                                    <div className="rounded border p-2 bg-light d-flex flex-wrap gap-2">
                                        {HANDICAPS.map(([v, l]) => (
                                            <div key={v} className="form-check form-check-inline mb-0">
                                                <input className="form-check-input" type="checkbox" id={`h_${v}`}
                                                    checked={form.types_handicap.includes(v)}
                                                    onChange={e => handleHandicap(v, e.target.checked)} />
                                                <label className="form-check-label" htmlFor={`h_${v}`}>{l}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="small fw-medium text-uppercase text-muted mb-2" style={{ letterSpacing: '.05em' }}>Situations spéciales</div>
                                    <div className="rounded border p-2 bg-light d-flex gap-4">
                                        <div className="form-check mb-0">
                                            <input className="form-check-input" type="checkbox" id="est_affecte" name="est_affecte" checked={form.est_affecte} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="est_affecte">Affecté de l'État</label>
                                        </div>
                                        <div className="form-check mb-0">
                                            <input className="form-check-input" type="checkbox" id="est_boursier" name="est_boursier" checked={form.est_boursier} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="est_boursier">Boursier</label>
                                        </div>
                                        <div className="form-check mb-0">
                                            <input className="form-check-input" type="checkbox" id="est_demi_boursier" name="est_demi_boursier" checked={form.est_demi_boursier} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="est_demi_boursier">Demi-boursier</label>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                    <NavLink to="/Eleves" className="btn btn-secondary">
                        <i className="fas fa-arrow-left me-1" />Retour
                    </NavLink>
                    <button type="submit" className="btn btn-primary px-4">
                        <i className="fas fa-save me-1" />Enregistrer les modifications
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DetailsEleve;
